"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {request} from "@/lib/api";
export default function Index(){const r=useRouter();const [setup,setSetup]=useState<boolean|null>(null);useEffect(()=>{request("/auth/setup-status").then(x=>{setSetup(x.needsSetup);r.replace(x.needsSetup?"/signup":"/login")}).catch(()=>r.replace("/login"))},[r]);return <main className="loading"><img src="/logo.png" alt="PetCard" width={72} height={72}/><p>Preparing your PetCard workspace…</p></main>}
