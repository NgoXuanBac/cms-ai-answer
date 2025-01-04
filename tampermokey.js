// ==UserScript==
// @name         CMS AI Answer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  no cheat
// @author       YourName
// @match        https://cmshn.fpt.edu.vn/*
// @connect      localhost
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  "use strict";
   async function fetchAIAnswer(question, prompt) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "POST",
          url: "http://localhost:3000/api/v1/answer",
          headers: {
            "Content-Type": "application/json",
          },
          data: JSON.stringify({
            question: question,
            prompt: prompt,
          }),
          onload: function (response) {
            if (response.status === 200) {
              const result = JSON.parse(response.responseText);
              resolve(result.answer);
            }
          },
          onerror: function (error) {
            reject("Failure. Unable to connect to server.");
          },
        });
      });
    }

   document.addEventListener("keydown", async (event) => {
      if (event.key === "x") {
        event.preventDefault();
        let answer = await fetchAIAnswer("No question", "What is tampermonkey?");
        console.log(answer);
      }
    });
})();