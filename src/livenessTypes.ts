export type LivenessResult={selfie:string;actions:string[];mode:'MEDIAPIPE_WEB';facesCount:number};
export type LivenessProps={actions:string[];onDone:(r:LivenessResult)=>void;onCancel:()=>void};

export const ACTION_TEXT:Record<string,string>={
 TURN_LEFT:'Başınızı sola çevirin və bir an saxlayın',
 TURN_RIGHT:'Başınızı sağa çevirin və bir an saxlayın',
 BLINK:'Gözünüzü qırpın',
 SMILE:'Gülümsəyin'
};
