import type { Metadata } from "next";
import { Nunito, Fredoka } from "next/font/google";
import "./globals.css";
const nunito=Nunito({subsets:["latin"],weight:["400","500","600","700","800","900"],variable:"--font-nunito"});
const fredoka=Fredoka({subsets:["latin"],variable:"--font-fredoka"});
export const metadata:Metadata={title:"PetCard Admin",description:"PetCard administration portal",icons:{icon:"/favicon.png"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className={`${nunito.variable} ${fredoka.variable}`}>{children}</body></html>}
