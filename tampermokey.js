// ==UserScript==
// @name         FPT CMS AI Answer
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  this isn't cheat tool
// @author       YourName
// @match        https://cmshn.fpt.edu.vn/*
// @connect      localhost
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  "use strict";

  function fetchImage(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        responseType: "blob",
        onload: function (response) {
          const blob = response.response;
          const reader = new FileReader();
          reader.onloadend = function () {
            resolve(reader.result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        onerror: reject,
      });
    });
  }

  async function extractQuestion(container) {
    const imageElements = Array.from(container.querySelectorAll("img"));
    const images = [];

    for (const imageElement of imageElements) {
      const src = imageElement.getAttribute("src");
      const type = src.split(".").pop();
      try {
        const file = await fetchImage(src);
        images.push({ file, type });
        imageElement.remove();
      } catch (error) {
        console.error("error: ", error);
      }
    }

    return {
      question: container.innerHTML.trim(),
      images,
    };
  }

  async function extractAnswers(container) {
    const answerElements = Array.from(container.querySelectorAll("div"));
    const answers = answerElements.map((element, index) => {
        const questionText = element.querySelector("label").innerHTML.trim();
        return {
            num: index + 1,
            question: questionText,
        };
    });
    return answers;
  }

  async function getQuestion() {
    const containers = document.querySelectorAll('div.que.multichoice[id^=q]');
    if(containers.length === 0) return null;
    const id = window.location.hash.match(/#q(\d+)/)?.[1] || 1;
    const container = containers.length === 1 ? containers[0] : containers[id - 1];
    
    const qtext = container.querySelector(".qtext");
    const answer = container.querySelector(".answer");
    const prompt = container.querySelector(".prompt");

    const {question, images} = await extractQuestion(qtext.cloneNode(true));
    const answers = await extractAnswers(answer.cloneNode(true));

    return { question, images, answers, prompt: prompt.innerHTML.trim() };
  }

  async function fetchAIAnswer(question, prompt, answers, images) {
    return new Promise((resolve, reject) => {
      const payload = {
        question: question,
        prompt: prompt,
        answers: answers,
        images: images,
      };

      console.log("payload:", payload);

      GM_xmlhttpRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/answer",
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify(payload),
        onload: function (response) {
          if (response.status === 200) {
            const result = JSON.parse(response.responseText);
            resolve(result.answer);
          } else {
            reject(`error: server responded with status ${response.status}`);
          }
        },
        onerror: function () {
          reject("error: unable to connect to server.");
        },
      });
    });
  }

  async function displayAnswer(
    question,
    answers,
    images,
    aiAnswer
  ) {
    const displayBox = document.createElement("div");
    displayBox.style.position = "fixed";
    displayBox.style.bottom = "10px";
    displayBox.style.right = "10px";
    displayBox.style.padding = "15px";
    displayBox.style.backgroundColor = "#e6ffe6";
    displayBox.style.border = "1px solid #99ff99";
    displayBox.style.boxShadow = "0px 0px 10px rgba(0,0,0,0.1)";
    displayBox.style.zIndex = "9999";
    displayBox.style.maxWidth = "400px";
    displayBox.style.borderRadius = "5px";
    displayBox.style.overflowY = "auto";
    displayBox.style.maxHeight = "80vh";

    displayBox.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px">Câu hỏi:</div>
            <div>${question}</div>
            <div style="font-weight: bold; margin-top: 10px">Hình ảnh:</div>
            <div>${
              images.length > 0
                ? images.map((img) => `Ảnh (${img.type})`).join(", ")
                : "Không có ảnh"
            }</div>
            <div style="font-weight: bold; margin-top: 10px">Đáp án:</div>
            <div>${answers
              .map(([num, content]) => `${num}. ${content}`)
              .join("<br>")}</div>
            <div style="font-weight: bold; margin-top: 10px">Đáp án từ AI:</div>
            <div>${aiAnswer}</div>
        `;

    document.body.appendChild(displayBox);
    setTimeout(() => displayBox.remove(), 10000);
  }

  document.addEventListener("keydown", async (event) => {
    if (event.key === "x") {
      event.preventDefault();
      const {question, answers, images, prompt} = await getQuestion();
      if (question) {
        try {
          const answer = await fetchAIAnswer(question, prompt, answers, images );
          displayAnswer(question, answers, images, answer);
        } catch (error) {
          alert(error);
        }
      } else {
        alert(`error: not found question`);
      }     
    }
  });
})();
