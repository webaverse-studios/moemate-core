const React = window.react; 
const { useState, useEffect, useRef } = React;
const CHUNK_SIZE = 10*1024*1024; // 10MB

// This function is used to split the text file into chunks of 10MB
function generateChunks(file) {
  let currentPosition = 0;
  const readChunk = async (file, currentPosition) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        resolve(event.target.result);
      };
      reader.onerror = reject;
      const blob = file.slice(currentPosition, currentPosition + CHUNK_SIZE);
      reader.readAsText(blob);
    });
  };
  return new Promise(async (resolve, reject) => {
    const textSplitter = window.textSplitter;
    let chunks = [];
    let endOfFile = false;
    while (!endOfFile) {
      try {
        const chunk = await readChunk(file, currentPosition);
        if (chunk.length < CHUNK_SIZE) {
          endOfFile = true;
        }
        chunks.push(chunk);
        currentPosition += chunk.length;
      } catch (error) {
        reject(error);
      }
    }
    const docs = await textSplitter.createDocuments(chunks);
    resolve(docs);
  });
}
// This function is used to upload the chunks to the companion
async function uploadMemories(file) {
  let results = [];
  if (file.name.endsWith('.txt')) {
    window.logger.info('Uploading text file:', file.name);
    try {
      results = await generateChunks(file);
    } catch (error) {
      window.logger.error(error);
    }
    window.companion.UploadKnowledge(results);
  } else {
    window.logger.error('Invalid file type. Please upload a text file.');
  }
}

// React component to upload the text file
export const UploadTxt = () => {
  const inputElement = useRef();
  const clearFileInputValue = event => {
    event.target.value = '';
  }
  const fileSelectedHandler = async event => {
    const selectedFile = event.target.files[0];
    await fileUploadHandler(selectedFile);
  };
  const fileUploadHandler = async selectedFile => {
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      await uploadMemories(selectedFile);
    } catch (error) {
      window.logger.error(error);
    }
  };
  return (
    <>
      <div className={window.styles.CompanionSettings.formItem} onClick={() => inputElement.current.click()}>
          <button className={window.styles.CompanionSettings.button}>
          <input type="file" 
            ref={inputElement} 
            onChange={fileSelectedHandler} 
            onClick={clearFileInputValue} 
            style={{display: "none"}} />
          Upload Knowledge
          </button>
      </div>
    </>
  );
};
