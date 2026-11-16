import {pipeline, env} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
env.allowLocalModels=false;
env.backends.onnx.wasm.numThreads=1;
let recognizer;
self.onmessage=async event=>{
 const {audio,language}=event.data;
 try{
  recognizer??=await pipeline('automatic-speech-recognition','onnx-community/whisper-tiny',{
   device:'wasm',dtype:'q8',progress_callback:progress=>{
    if(progress.status==='progress')self.postMessage({type:'progress',message:'正在下载语音模型：'+Math.round(progress.progress||0)+'%'});
   }
  });
  self.postMessage({type:'progress',message:'正在识别语音与时间点，长视频需要更多时间…'});
  const result=await recognizer(audio,{task:'transcribe',return_timestamps:true,chunk_length_s:28,stride_length_s:4,...(language?{language}:{})});
  self.postMessage({type:'result',result});
 }catch(error){self.postMessage({type:'error',message:error.message});}
};
