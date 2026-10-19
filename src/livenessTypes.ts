export type LivenessResult={selfie:string;actions:string[];mode:'MEDIAPIPE_WEB';facesCount:number};
export type LivenessProps={actions:string[];onDone:(r:LivenessResult)=>void;onCancel:()=>void};

export const ACTION_TEXT:Record<string,string>={
 TURN_LEFT:'Başınızı yavaşca sola çevirin',
 TURN_RIGHT:'Başınızı yavaşca sağa çevirin',
 BLINK:'Gözünüzü qırpın',
 SMILE:'Gülümsəyin'
};
