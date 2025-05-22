// DOM Elements
const uploadContainer = document.getElementById('upload-container');
const dropZone = document.getElementById('drop-zone');
const previewContainer = document.getElementById('preview-container');
const originalImageContainer = document.getElementById('original-image-container');
const processedResultContainer = document.getElementById('processed-result-container');
const processBtn = document.getElementById('process-btn');
const downloadBtn = document.getElementById('download-btn');
const resultNotice = document.querySelector('.result-notice');
const deleteBtn = document.getElementById('delete-btn');

// API Configuration
const API_ENDPOINT = 'https://api.remove.bg/v1.0/removebg';
const API_KEY = 'RZsst5tG2W6QFipYd9AxjfEv';

// Helper: Set process button disabled + tooltip for no credits
function setProcessBtnDisabled(isDisabled) {
    processBtn.disabled = isDisabled;
    if (isDisabled) {
        processBtn.setAttribute('title', 'Out of credits');
    } else {
        processBtn.removeAttribute('title');
    }
}

// Handle file selection
function handleFileSelect(file) {
    if (!file.type.match('image.*')) {
        alert('Please select an image file (JPEG, PNG, etc.)');
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.classList.add('preview-image');
        img.alt = 'Uploaded image preview';

        originalImageContainer.innerHTML = '';
        originalImageContainer.appendChild(img);

        uploadContainer.classList.add('hidden');
        previewContainer.classList.remove('hidden');
        resultNotice.textContent = 'Ready to process your image';

        setProcessBtnDisabled(false);
        downloadBtn.disabled = true;
    };

    reader.readAsDataURL(file);
}

// Drag and drop events
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#8b5cf6';
    dropZone.style.backgroundColor = '#252525';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#333';
    dropZone.style.backgroundColor = '#1e1e1e';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#333';
    dropZone.style.backgroundColor = '#1e1e1e';

    if (e.dataTransfer.files.length) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

dropZone.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (e) => {
        if (e.target.files.length) {
            handleFileSelect(e.target.files[0]);
        }
    };

    input.click();
});

// Delete button functionality
deleteBtn.addEventListener('click', () => {
    originalImageContainer.innerHTML = '';
    processedResultContainer.innerHTML = `
        <div class="placeholder-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="placeholder-icon">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                <circle cx="10" cy="12" r="2"></circle>
                <path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22"></path>
            </svg>
        </div>
    `;

    previewContainer.classList.add('hidden');
    uploadContainer.classList.remove('hidden');

    setProcessBtnDisabled(false);
    downloadBtn.disabled = true;
    processBtn.textContent = 'Remove Background';
    resultNotice.textContent = 'Result will appear here';
});

// Enhanced API Call Function with quota check
async function callBackgroundRemovalAPI(imageData) {
    try {
        const formData = new FormData();
        formData.append('image_file', imageData);

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'X-Api-Key': API_KEY
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            let userMessage = 'An error occurred.';

            if (response.status === 403 || response.status === 429) {
                userMessage = '⚠️ API limit reached or unauthorized. Check your remove.bg plan or API key.';
            } else if (response.status === 400 && errorText.includes('Invalid image format')) {
                userMessage = 'The uploaded image format is not supported.';
            } else if (errorText) {
                userMessage = `⚠️ API Error: ${errorText}`;
            }

            throw new Error(userMessage);
        }

        const blob = await response.blob();

        // Get usage headers
        const remainingCredits = response.headers.get('X-Free-Credits');
        return { imageUrl: URL.createObjectURL(blob), creditsLeft: remainingCredits };
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Process button handler
processBtn.addEventListener('click', async () => {
    processBtn.disabled = true;
    const originalText = processBtn.textContent;
    processBtn.innerHTML = '<div class="loading-spinner"></div>';
    resultNotice.textContent = 'Processing your image...';

    try {
        const originalImg = originalImageContainer.querySelector('img');
        if (!originalImg) throw new Error('No image found');

        const response = await fetch(originalImg.src);
        const blob = await response.blob();

        const { imageUrl, creditsLeft } = await callBackgroundRemovalAPI(blob);

        processedResultContainer.innerHTML = `
            <img src="${imageUrl}" class="preview-image" alt="Processed result">
        `;

        if (creditsLeft !== null) {
            const creditsNum = Number(creditsLeft);
            resultNotice.textContent = `Done! You have ${creditsNum} free credit${creditsNum === 1 ? '' : 's'} left.`;
            
            if (creditsNum <= 0) {
                setProcessBtnDisabled(true);
            } else {
                setProcessBtnDisabled(false);
            }
        } else {
            resultNotice.textContent = 'Background removed!';
            setProcessBtnDisabled(false);
        }

        downloadBtn.disabled = false;

    } catch (error) {
        console.error('Error processing image:', error);
        resultNotice.innerHTML = `<span style="color: #ff6b6b;">${error.message}</span>`;
        processedResultContainer.innerHTML = `
            <div class="placeholder-content">
                <p style="color: #ff6b6b;"> ${error.message}</p>
            </div>
        `;
    } finally {
        processBtn.textContent = originalText;
        if (!processBtn.disabled) {
            processBtn.disabled = false; // enable only if credits exist
        }
    }
});

// Download button
downloadBtn.addEventListener('click', () => {
    const processedImg = processedResultContainer.querySelector('img');
    if (processedImg) {
        const link = document.createElement('a');
        link.href = processedImg.src;
        link.download = 'wipey-background-removed.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        const originalText = downloadBtn.textContent;
        downloadBtn.textContent = 'Downloaded!';
        setTimeout(() => {
            downloadBtn.textContent = originalText;
        }, 2000);
    }
});
