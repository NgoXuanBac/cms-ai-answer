// ==UserScript==
// @name         FPT CMS Display Question, Answers with Images by #q Hash
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  hash #q with AI answers and image handling
// @author       YourName
// @match        https://cmshn.fpt.edu.vn/*
// @connect      localhost
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  "use strict";

  function fetchImageAsBase64(url) {
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

  function getQuestionIdFromHash() {
    const hash = window.location.hash;
    const match = hash.match(/#q(\d+)/);
    return match ? match[1] : 1;
  }

  async function extractQuestionContent(questionElement) {
    const textContent = questionElement.cloneNode(true);
    const images = Array.from(textContent.querySelectorAll("img"));
    const imageData = [];

    for (const img of images) {
      const src = img.getAttribute("src");
      const fileType = src.split(".").pop();
      try {
        const base64File = await fetchImageAsBase64(src);
        imageData.push({ file: base64File, type: fileType });
        img.remove();
      } catch (error) {
        console.error("Lỗi khi tải ảnh:", error);
      }
    }

    return {
      text: textContent.innerHTML.trim(),
      images: imageData,
    };
  }

  async function getQuestionAndAnswersById(questionId) {
    const questionElements = document.querySelectorAll(".qtext");
    const answerElements = document.querySelectorAll(".answer");

    if (questionElements.length === 0 || answerElements.length === 0) {
      return null;
    }

    const questionIndex = parseInt(questionId, 10) - 1;

    if (questionIndex < 0 || questionIndex >= questionElements.length) {
      return null;
    }

    const questionContent = await extractQuestionContent(
      questionElements[questionIndex]
    );

    const selectedAnswerElement = answerElements[questionIndex];
    const answer = selectedAnswerElement
      ? [[questionIndex + 1, selectedAnswerElement.innerText.trim()]]
      : [];

    return { ...questionContent, answers: answer };
  }

  async function fetchAIAnswer(question, prompt, answers, images) {
    return new Promise((resolve, reject) => {
      const payload = {
        question: question,
        prompt: prompt,
        answers: answers,
        images: images,
      };

      console.log("Payload gửi đi:", payload);

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
            reject(`Error: Server responded with status ${response.status}`);
          }
        },
        onerror: function () {
          reject("Error: Unable to connect to server.");
        },
      });
    });
  }

  async function displayQuestionAndAnswer(
    questionText,
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
            <div>${questionText}</div>
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

      const questionId = getQuestionIdFromHash();
      let questionText, answers, images;

      if (questionId) {
        const questionData = await getQuestionAndAnswersById(questionId);
        if (questionData) {
          questionText = questionData.text;
          answers = questionData.answers;
          images = questionData.images;
        } else {
          alert(`Không tìm thấy câu hỏi có mã ${questionId}`);
          return;
        }
      } else {
        alert("Không có mã câu hỏi trong URL!");
        return;
      }

      try {
        const aiAnswer = await fetchAIAnswer(
          questionText,
          "chọn đáp án đúng nhất, không cần giải thích",
          answers,
          images
        );
        displayQuestionAndAnswer(questionText, answers, images, aiAnswer);
      } catch (error) {
        alert("Lỗi khi kết nối đến server: " + error);
      }
    }
  });
})();
