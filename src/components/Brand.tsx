/* PetCard brand lock-up: logo mark on the left, PET (black) + CARD (orange) wordmark
   with the "WORLD'S FIRST AI-ENABLED PET ID" tagline on the right. */
export default function Brand({size="md",markOnly=false,className=""}:{size?:"sm"|"md"|"lg";markOnly?:boolean;className?:string}){
  return <div className={`brandLock brand-${size} ${markOnly?"markOnly":""} ${className}`}>
    <img className="brandMark" src="/logo.png" alt="PetCard logo" draggable={false}/>
    {!markOnly&&<div className="brandText"><div className="brandWord">PET<span>CARD</span></div><div className="brandTag">WORLD’S FIRST AI-ENABLED PET ID</div></div>}
  </div>;
}
