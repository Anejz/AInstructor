function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

function getActiveTab() {
    if (document.getElementById('Recording').style.display === 'block') {
        return 'Recording';
    } else if (document.getElementById('Uploading').style.display === 'block') {
        return 'Uploading';
    }
    return null;
}
function setTranscriptionVisibility(show) {
    const elements = document.querySelectorAll('.transcription-related');
    elements.forEach(el => {
        el.classList.toggle('hidden', !show);
    });
}

// Set default active tab on page load
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.tablink').click(); // Open the first tab
});
// script.js
document.getElementById('transcribeButton').addEventListener('click', function(e) {
    e.preventDefault();
    const activeTab = getActiveTab();
    document.getElementById('loading-spinner').classList.remove('d-none');
    document.getElementById('progress-container').classList.remove('d-none');
    updateProgressBar(0);
    if (activeTab === 'Recording') {
        // Logic for transcribing the recorded audio
        
        document.querySelector('.chat-area').classList.remove('hidden');
        document.querySelector('.chat-interface').style.display = 'none';
        document.querySelector('.transcription-results-container').classList.remove('hidden');
        document.querySelector('.transcription-section').style.width = '30%';
        document.querySelector('.chat-interface-section').style.width = '70%';
        transcribeRecording();
    } else if (activeTab === 'Uploading') {
        // Logic for transcribing the uploaded file
        document.querySelector('.chat-area').classList.remove('hidden');
        document.querySelector('.chat-interface').style.display = 'none';
        document.querySelector('.transcription-results-container').classList.remove('hidden');
        document.querySelector('.transcription-section').style.width = '30%';
        document.querySelector('.chat-interface-section').style.width = '70%';
        transcribeUpload();
        
    } else {
        console.error('No active tab found');
    }

    
});
function transcribeUpload(){
    const formData = new FormData();
    formData.append('file', document.getElementById('fileUpload').files[0]);

    document.getElementById('loading-spinner').classList.remove('hidden');
    setTranscriptionVisibility(false);
    const language = document.getElementById('language').value;
    if (language) {
        formData.append('language', language);
    }
    fetch('/transcribe', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        updateProgressBar(100);
        document.getElementById('loading-spinner').classList.add('d-none');
        //showChatArea();
        
        document.getElementById('loading-spinner').classList.add('hidden');
        setTranscriptionVisibility(true);
        return response.json();
    })
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        document.getElementById('transcription-textarea').value = data.transcription;
        document.getElementById('error-message').classList.add('d-none');
        document.getElementById('loading-spinner').classList.add('hidden');
        setTranscriptionVisibility(true);
    })
    .catch(error => {
        updateProgressBar(0);
        document.getElementById('loading-spinner').classList.add('d-none');
        console.error('Error:', error);
        document.getElementById('error-message').textContent = error.message;
        document.getElementById('error-message').classList.remove('d-none');
        document.getElementById('loading-spinner').classList.add('hidden');
        setTranscriptionVisibility(true);
    });
}
function transcribeRecording() {
    // Check if there are recorded audio chunks
    if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');

        document.getElementById('loading-spinner').classList.remove('hidden');
        setTranscriptionVisibility(false);

        const language = document.getElementById('language').value;
        if (language) {
            formData.append('language', language);
        }

        fetch('/transcribe', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('transcription-textarea').textContent = data.transcription;
            document.getElementById('loading-spinner').classList.add('hidden');
            setTranscriptionVisibility(true);
        })
        .catch(error => console.error('Error:', error));
    } else {
        console.error('No audio chunks available for transcription.');
    }
}

function updateProgressBar(percent) {
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = percent + '%';
    progressBar.setAttribute('aria-valuenow', percent);
}

// Audio Playback
document.getElementById('fileUpload').addEventListener('change', function(event) {
    const audioPlayer = document.getElementById('audioPlaybackUpload');
    const file = event.target.files[0];
    if (file) {
        audioPlayer.src = URL.createObjectURL(file);
        audioPlayer.hidden = false;
    }
});

// Audio Recording


// 1. Initialize MediaRecorder
let mediaRecorder;
let audioChunks = [];

function initMediaRecorder(stream) {
    console.log('Initializing MediaRecorder with the stream:', stream);
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.addEventListener('dataavailable', event => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    });
    function setRecordingAsFile(audioBlob, filename) {
        const audioFile = new File([audioBlob], filename, { type: 'audio/webm' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(audioFile);
        document.getElementById('fileInput').files = dataTransfer.files;
    }
    // Updated to handle promises and errors more effectively
    mediaRecorder.addEventListener('stop', async () => {
        try {
            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                console.log('Recording stopped, audio available at:', audioUrl);
                const audioElement = document.getElementById('audioPlaybackRecord');
                const uploadLabel = document.getElementById('uploadLabel');
                audioElement.src = audioUrl;
                audioElement.hidden = false;
                setRecordingAsFile(audioBlob, "recording.webm");
                audioElement.load(); // Ensure the audio element loads the new blob URL
                audioElement.play(); // Optional: Attempt to play the audio immediately
            } else {
                console.error('No audio chunks available.');
            }
        } catch (error) {
            console.error('Error after stopping recording:', error);
        }
    });
}

// 2. Test the Stream
document.getElementById('startRecording').addEventListener('click', () => {
    event.preventDefault();
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            if (stream.active && stream.getAudioTracks().length > 0) {
                console.log('Stream is active with audio tracks:', stream.getAudioTracks());
                initMediaRecorder(stream);
                mediaRecorder.start();
                updateRecordingUI(true);
                document.getElementById('stopRecording').disabled = false;
            } else {
                console.error('Stream is not active or does not have audio tracks.');
            }
        })
        .catch(err => {
            console.error("Error accessing the microphone: ", err);
            alert("Error accessing the microphone: " + err.message);
        });
});

// 3. Check Blob Creation and 4. Audio Playback are handled in the 'stop' event listener
document.getElementById('stopRecording').addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        document.getElementById('stopRecording').disabled = true;
        updateRecordingUI(false);
    } else {
        console.error('MediaRecorder is not recording.');
    }
});
function updateRecordingUI(isRecording) {
    const startBtn = document.getElementById('startRecording');
    const stopBtn = document.getElementById('stopRecording');
    if (isRecording) {
        startBtn.classList.add('recording');
        startBtn.textContent = 'Recording...';
        stopBtn.style.display = 'inline-block';
    } else {
        startBtn.classList.remove('recording');
        startBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Start Recording';
        stopBtn.style.display = 'none';
    }
}
let currentFilename = null;
document.getElementById('save-transcription-btn').addEventListener('click', function() {
    document.getElementById('filename-input-container').classList.remove('hidden');
    
});
document.getElementById('save-filename-btn').addEventListener('click', function() {
    const transcriptionText = document.getElementById('transcription-textarea').value;
    let filename = document.getElementById('filename-input').value.trim();

    if (!filename) {
        alert('Filename is required to save the transcription.');
        return;
    }

    // Ensure the filename ends with '.txt'
    if (!filename.toLowerCase().endsWith('.txt')) {
        filename += '.txt';
    }

    saveTranscription(transcriptionText, filename);
});

function saveTranscription(transcriptionText, filename) {
    fetch('/save-transcription', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transcription: transcriptionText, filename: filename })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        document.getElementById('filename-input-container').classList.add('hidden');
        fetchAndDisplaySavedFiles();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error saving transcription.');
    });
}
document.getElementById('filename-input').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent the default form submission behavior
        document.getElementById('save-filename-btn').click(); // Trigger click on the send button
    }
});
document.getElementById('transcription-textarea').addEventListener('blur', function() {
    if (currentFilename) {
        const transcriptionText = this.value;
        saveTranscription(transcriptionText, currentFilename);
    }
});
document.getElementById('file-content-area').addEventListener('blur', function() {
    if (currentFilename) {
        const transcriptionText = this.value;
        saveTranscription(transcriptionText, currentFilename);
    }
});
function fetchAndDisplaySavedFiles() {
    fetch('/list-saved-transcriptions')
    .then(response => response.json())
    .then(data => {
        const fileListElement = document.getElementById('saved-files-list');
        fileListElement.innerHTML = ''; // Clear existing list
        document.querySelector('.file-listing-section').classList.remove('hidden');
        data.files.forEach(file => {
            const fileElement = document.createElement('li');
            fileElement.textContent = file;
            fileElement.onclick = () => openSavedFile(file);
            fileListElement.appendChild(fileElement);
        });
    })

    .catch(error => console.error('Error fetching saved files:', error));
}
document.addEventListener('DOMContentLoaded', function() {
    fetchAndDisplaySavedFiles(); // Fetch and display saved files on page load
});
let selectedFileContent = '';
function openSavedFile(filename) {
    fetch(`/get-file-content?filename=${encodeURIComponent(filename)}`)
        .then(response => response.json())
        .then(data => {
            const fileContentArea = document.getElementById('file-content-area');
            if (fileContentArea) {
                fileContentArea.value = data.content; // Assuming 'content' is the key in the response containing the file text
                selectedFileContent = data.content;
                currentFilename = filename;
                fileContentArea.classList.remove('hidden'); // Make the textarea visible

                // Optionally, adjust layout if needed
                document.querySelector('.transcription-section').style.width = '30%';
                document.querySelector('.chat-interface-section').style.width = '70%';
                document.querySelector('.chat-area').classList.remove('hidden');
                document.querySelector('.chat-interface').style.display = 'flex';
                document.querySelector('.chat-interface-section').classList.remove('hidden');
                document.querySelector('.transcription-results-container').classList.add('hidden');
            } else {
                console.error('File content area element not found');
            }
        })
        .catch(error => console.error('Error fetching file content:', error));
        updateSelectedFileInList(filename);
}
function updateSelectedFileInList(selectedFilename) {
    const fileListElement = document.getElementById('saved-files-list');
    Array.from(fileListElement.children).forEach(fileElement => {
        if (fileElement.textContent === selectedFilename) {
            fileElement.classList.add('selected-file');
        } else {
            fileElement.classList.remove('selected-file');
        }
    });
}


document.getElementById('summarize-btn').addEventListener('click', function() {
    document.getElementById('user-input').value = "Summarize the text"
    document.getElementById('send-button').click();
});

document.getElementById('generate-questions-btn').addEventListener('click', function() {
    document.getElementById('user-input').value = "Generate questions from the text"
    document.getElementById('send-button').click();
});

document.getElementById('explain-btn').addEventListener('click', function() {
    document.getElementById('user-input').value = "Explain the content to me like I am 5"
    document.getElementById('send-button').click();

});


// [Rest of the JavaScript]

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.tablink').click(); // Open the first tab
    setTranscriptionVisibility(false); // Hide transcription-related elements on page load
});

document.getElementById('send-button').addEventListener('click', function() {
    const userInput = document.getElementById('user-input').value;
    if (!userInput.trim()) return; // Avoid sending empty messages

    const messageData = {
        message: userInput,
        fileContent: selectedFileContent
    };
    // Display user message
    addMessage('User', userInput, 'user-message', 'message-bubble-user');

    // Send to server and get response
    fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput ,
        fileContent: document.getElementById('file-content-area').value})
    })
    .then(response => response.json())
    .then(data => {
        // Display GPT's response
        addMessage('AI', data.reply, 'ai-message', 'message-bubble-ai');
    })
    .catch(error => console.error('Error:', error));

    // Clear input field
    document.getElementById('user-input').value = '';
});
document.getElementById('user-input').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent the default form submission behavior
        document.getElementById('send-button').click(); // Trigger click on the send button
    }
});
function selectFile(filename) {
    fetch(`/get-file-content?filename=${encodeURIComponent(filename)}`)
    .then(response => response.json())
    .then(data => {
        selectedFileContent = data.content; // Assuming the server sends back the file content
    })
    .catch(error => console.error('Error loading file content:', error));
}

function addMessage(sender, message, messageClass, bubbleClass) {
    const chatMain = document.querySelector('.chat-main');
    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add(messageClass);

    const avatar = document.createElement('div');
    avatar.classList.add(sender === 'User' ? 'user-avatar' : 'ai-avatar');
    avatar.textContent = sender === 'User' ? 'U' : 'AI';

    const messageBubble = document.createElement('div');
    messageBubble.classList.add(bubbleClass);
    messageBubble.textContent = message;

    messageWrapper.appendChild(avatar);
    messageWrapper.appendChild(messageBubble);
    chatMain.appendChild(messageWrapper);

    // Scroll to the latest message
    chatMain.scrollTop = chatMain.scrollHeight;
}

function toggleChatInterface(showChat) {
    const mainContainer = document.querySelector('.main-container');
    const chatSection = document.querySelector('.chat-interface-section');

    if (showChat) {
        mainContainer.classList.add('chat-interface-visible');
        chatSection.classList.remove('hidden');
    } else {
        mainContainer.classList.remove('chat-interface-visible');
        chatSection.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const textarea = document.getElementById('file-content-area');
    const resizeHandle = document.getElementById('resize-handle');

    let startY, startHeight;

    resizeHandle.addEventListener('mousedown', function(e) {
        startY = e.clientY;
        startHeight = parseInt(document.defaultView.getComputedStyle(textarea).height, 10);
        document.documentElement.addEventListener('mousemove', doDrag, false);
        document.documentElement.addEventListener('mouseup', stopDrag, false);
    });

    function doDrag(e) {
        textarea.style.height = (startHeight + e.clientY - startY) + 'px';
    }

    function stopDrag() {
        document.documentElement.removeEventListener('mousemove', doDrag, false);
        document.documentElement.removeEventListener('mouseup', stopDrag, false);
    }
});