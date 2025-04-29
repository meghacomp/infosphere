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
const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if (!userMessage || document.body.classList.contains("bot-responding")) return;
    userData.message = userMessage;

    promptInput.value = "";
    document.body.classList.add("bot-responding","chats-active");
    fileUploadContainer.classList.remove("file-attached", "img-attached", "active");

    // Generate user message HTML with optional file attachment
  const userMsgHTML = `
  <p class="message-text"></p>
  ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : `<p class="file-attachment"><span class="material-symbols-outlined">description</span>${userData.file.fileName}</p>`) : ""}
  `;
    const userMsgDiv= createMsgElement(userMsgHTML,"message-user");
    userMsgDiv.querySelector(".message-text").textContent=userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(() => {
        // Generate bot message HTML and add in the chats container after 600ms
        const botMsgHTML = '<img src="icon.png" alt="" class="avatar"> <p class="message-text"> Just a Sec....</p>';
        const botMsgDiv = createMsgElement(botMsgHTML, "message-bot", "loading");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();

        // Check if user asked for date and time
        if (userMessage.toLowerCase().includes("time") || userMessage.toLowerCase().includes("date")) {
            const currentDateTime = new Date().toLocaleString();  // Get the current date and time
            const responseText = `Current date and time: ${currentDateTime}`;
            typingEffect(responseText, botMsgDiv.querySelector(".message-text"), botMsgDiv);
            chatHistory.push({ role: "model", parts: [{ text: responseText }] });
        } else {
            // Generate normal bot response via API if not asking for date/time
            generateResponse(botMsgDiv);
        }
    }, 600);

}

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
