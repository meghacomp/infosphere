const  container =document.querySelector(".container");
const  chatsContainer=document.querySelector(".chat-box");

const promptForm=document.querySelector(".prompt-form");
const promptInput=promptForm.querySelector(".prompt-input");
const fileInput=promptForm.querySelector("#file-input");
const fileUploadContainer=promptForm.querySelector(".file-upload-container");
const themeToggle=document.querySelector("#toggle-btn");


//API SETUP
const API_KEY = "AIzaSyAuB_YKzs0TOVUWlAaaDGIS2pcQo8uGqFA"; // Your API key here
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;



let typingInterval,controller;
const chatHistory=[];
const userData= {message: "", file: {} };


// GNews API Integration for Latest India News
const fetchIndiaNews = async () => {
    const GNEWS_API_KEY = "516ff6342f46cdff54fcdf620673ea09"; //GNews key
    const url = `https://gnews.io/api/v4/top-headlines?country=in&lang=en&max=5&token=${GNEWS_API_KEY}`;
  
    try {
      const res = await fetch(url);
      const data = await res.json();
  
      if (!data.articles || data.articles.length === 0) {
        return "🗞️ No recent Indian news found in the last 24 hours.";
      }
  
      const newsList = data.articles
        .map(article => `📰 ${article.title}<br><a href="${article.url}" target="_blank">${article.source.name}</a>`)
        .join("<br><br>");
  
      return `🗞️ <b>Latest News from India (last 24 hrs):</b><br><br>${newsList}`;
    } catch (error) {
      return "❌ Failed to fetch Indian news.";
    }
  };
  
//function to create message elemnts 
const createMsgElement =  (content,...classes)=>
{
    const div = document.createElement("div");
    div.classList.add("message",...classes);
    div.innerHTML=content;
    return div;
}
//scroll to the bottom of the container
const scrollToBottom = () => container.scrollTo({ top:container.scrollHeight, behavior: "smooth" });


//simulate typing effect for bot responses
const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent="";
    const words=text.split(" ");
    let wordIndex=0;

    //set an interval to type each word
    typingInterval=setInterval(() => 
    {
        if(wordIndex < words.length)
        {
            textElement.textContent+=(wordIndex===0?" ":" ")+words[wordIndex++];
            scrollToBottom();
        }else{
            clearInterval(typingInterval);
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
        }
    },40);
}
// Make API call and generate the bot's response
const generateResponse= async(botMsgDiv) =>{
    const textElement= botMsgDiv.querySelector(".message-text");
    controller = new AbortController();

 //add user message and file data to chat history
 chatHistory.push({
    role: "user",
    parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])],
  });
    try{

         // Check if the user is asking about the model introduction
         const introQueryPattern = /^(who are you\??|what are you\??|who created you\??|who are u\??|tell me about yourself\??|who developed you\??|how you were developed\??)$/i;
         if (introQueryPattern.test(userData.message)) {
             const introductionText = `Hello! My name is Infosphere. I am an AI Model developed by Megha, Nancy, Priya and Sakshi. I can assist you with various tasks, answer questions, and have conversations. Feel free to ask me anything!`;
             typingEffect(introductionText, textElement, botMsgDiv);
             chatHistory.push({ role: "model", parts: [{ text: introductionText }] });
             return;
         }

         // Check if the user is asking about the model 
         const developQueryPattern = /^(when were you created\??|when was your birthday\??|your creation\??|when were you developed\??|when were you born\??)$/i;
         if (developQueryPattern.test(userData.message)) {
             const DevelopText = `I was developed in April 2025.`;
             typingEffect(DevelopText, textElement, botMsgDiv);
             chatHistory.push({ role: "model", parts: [{ text: DevelopText }] });
             return;
         }

        // Check if the user is asking about the working 
         const WorkQueryPattern = /^(what is your work\??|what you can do\??|what can you perform\??|what you do\??|how you work\??|when were you born\??)$/i;
         if (WorkQueryPattern.test(userData.message)) {
             const WorkText = `I was developed in April 2025.`;
             typingEffect(WorkText, textElement, botMsgDiv);
             chatHistory.push({ role: "model", parts: [{ text: WorkText }] });
             return;
         }
        //send the chat history to the API to get a response
        const response =await fetch(API_URL, {
                method:"POST",
                headers:  {"Content-Type": "application/json"} ,
                body: JSON.stringify({contents: chatHistory}),
                signal: controller.signal
            }
        );
        const data=await response.json()
        if(!response.ok) throw new Error(data.error.message);

//process the response text and display it
const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
typingEffect(responseText, textElement, botMsgDiv);
chatHistory.push({ role: "model", parts: [{ text: responseText }] });
} catch (error) {
textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
textElement.style.color = "#d62939";
botMsgDiv.classList.remove("loading");
document.body.classList.remove("bot-responding");
scrollToBottom();
} finally {
userData.file = {};
}
};

//handle form submission 
const handleFormSubmit = async (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if (!userMessage || document.body.classList.contains("bot-responding")) return;
    userData.message = userMessage;

    promptInput.value = "";
    document.body.classList.add("bot-responding", "chats-active");
    fileUploadContainer.classList.remove("file-attached", "img-attached", "active");

    const userMsgHTML = `
      <p class="message-text"></p>
      ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : `<p class="file-attachment"><span class="material-symbols-outlined">description</span>${userData.file.fileName}</p>`) : ""}
    `;
    const userMsgDiv = createMsgElement(userMsgHTML, "message-user");
    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(async () => {
        const botMsgHTML = '<img src="icon.png" alt="" class="avatar"> <p class="message-text"> Just a Sec....</p>';
        const botMsgDiv = createMsgElement(botMsgHTML, "message-bot", "loading");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();

        const isDateTimeQuery = /^(what\s+is\s+)?(the\s+)?(current\s+)?(date|time|date\s+and\s+time)(\s+now)?\??$/i.test(userMessage.trim());
        if (isDateTimeQuery) {
            const currentDateTime = new Date().toLocaleString();
            const responseText = `Current date and time: ${currentDateTime}`;
            typingEffect(responseText, botMsgDiv.querySelector(".message-text"), botMsgDiv);
            chatHistory.push({ role: "model", parts: [{ text: responseText }] });
            return;
        }

   
        // Check if it's a weather-related question
        const weatherMatch = userMessage.match(/(?:temperature|weather) in ([a-zA-Z\s]+)/i);
        if (weatherMatch) {
            const city = weatherMatch[1].trim();
            const apiKey = 'c098db7a9b6aa3310c463d4bccf243e4'; // weather key
            const weatherURL = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

            try {
                const res = await fetch(weatherURL);
                const data = await res.json();
                if (res.ok) {
                    const temp = data.main.temp;
                    const weatherDescription = data.weather[0].description;
                    const responseText = `The weather in ${city} is ${weatherDescription}, with a temperature of ${temp}°C.`;
                    
                    typingEffect(responseText, botMsgDiv.querySelector(".message-text"), botMsgDiv);
                    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
                    return;
                } else {
                    throw new Error(`No weather data found for "${city}".`);
                }
            } catch (err) {
                const errorText = err.message || "Failed to fetch weather.";
                typingEffect(errorText, botMsgDiv.querySelector(".message-text"), botMsgDiv);
                chatHistory.push({ role: "model", parts: [{ text: errorText }] });
                return;
            }
        }
        // Check if user asks for any of the common news patterns
const newsPattern = /\b(latest\s+news|news\s+updates|latest\s+updates|updates|breaking\s+news|india\s+breaking\s+news|india\s+news|india\s+updates)\b/i;

if (newsPattern.test(userMessage.trim())) {
  const newsText = await fetchIndiaNews();

  botMsgDiv.classList.remove("loading");
  document.body.classList.remove("bot-responding");

  const textElement = botMsgDiv.querySelector(".message-text");
  textElement.innerHTML = newsText; // Show formatted HTML with links and text
  chatHistory.push({ role: "model", parts: [{ text: newsText }] });

  scrollToBottom();
  return;
}


        // Otherwise, use API
        generateResponse(botMsgDiv);
    }, 600);
};


// Handle file input change (file upload)
fileInput.addEventListener("change",() => {
    const file = fileInput.files[0];
    if(!file) return;

    const isImage =file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1];
        fileUploadContainer.querySelector(".file-preview").src = e.target.result;
        fileUploadContainer.classList.add("active", isImage ? "img-attached" : "file-attached");

        // Store file data in userData obj
        userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
      };
    });

//cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click",() => {
    userData.file={};
    fileUploadContainer.classList.remove("active", "img-attached", "file-attached" );
});

// Stop Bot Response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    controller?.abort();
    userData.file = {};
    clearInterval(typingInterval);
    chatsContainer.querySelector(".message-bot.loading").classList.remove("loading");
    document.body.classList.remove("bot-responding");
  });


//Delete all chats
document.querySelector("#delete-btn").addEventListener("click",() => {
    chatHistory.length=0;
    chatsContainer.innerHTML="";
    document.body.classList.remove("bot-responding","chats-active");
});

//Handle suggestions click
document.querySelectorAll(".list-item") .forEach(item => {
    item.addEventListener("click",() =>{
        promptInput.value=item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit"));
    });
});


// Show/hide controls for mobile on prompt input focus
document.addEventListener("click", ({ target }) => {
    const Promptcontent = document.querySelector(".prompt-content");
    const shouldHide = target.classList.contains("prompt-input") || (Promptcontent.classList.contains("hide-controls") && (target.id === "add-file-btn" || target.id === "stop-response-btn"));
    Promptcontent.classList.toggle("hide-controls", shouldHide);
  });

//Toggle dark/light theme 
themeToggle.addEventListener("click",()=> {
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode": "dark_mode");
    themeToggle.textContent= isLightTheme ? "dark_mode":"light_mode";
});

//Set initial theme from local storage
const isLightTheme = localStorage.getItem("themeColor")==="light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggle.textContent= isLightTheme ? "dark_mode":"light_mode";

promptForm.addEventListener("submit",handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());

// Voice recognition setup
const voiceBtn = document.getElementById("voice-btn");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    voiceBtn.addEventListener("click", () => {
        if (voiceBtn.classList.contains("listening")) {
            recognition.stop();
            voiceBtn.classList.remove("listening");
            return;
        }
        recognition.start();
        voiceBtn.classList.add("listening");
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        promptInput.value = transcript;
        promptInput.focus();
        promptForm.requestSubmit(); // Automatically submit
        voiceBtn.classList.remove("listening");
    };

    recognition.onerror = () => {
        voiceBtn.classList.remove("listening");
    };

    recognition.onend = () => {
        voiceBtn.classList.remove("listening");
    };
} else {
    voiceBtn.disabled = true;
    voiceBtn.title = "Voice search not supported";
}



