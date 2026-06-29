/** Messages rapides style Chess.com pour le chat en partie */

export interface ChatPhrase {
  id: string;
  textFr: string;
  textEn: string;
}

export const GAME_CHAT_PHRASES: ChatPhrase[] = [
  { id: "hi", textFr: "Bonjour !", textEn: "Hi!" },
  { id: "gl", textFr: "Bonne chance !", textEn: "Good luck!" },
  { id: "hf", textFr: "Amuse-toi bien !", textEn: "Have fun!" },
  { id: "gg", textFr: "Belle partie !", textEn: "Good game!" },
  { id: "wp", textFr: "Bien joué !", textEn: "Well played!" },
  { id: "thanks", textFr: "Merci !", textEn: "Thanks!" },
  { id: "oops", textFr: "Oups…", textEn: "Oops…" },
  { id: "sorry", textFr: "Désolé, je dois partir.", textEn: "Sorry, I have to go." },
];

export function phraseLabel(phrase: ChatPhrase, locale: string): string {
  return locale === "fr" ? phrase.textFr : phrase.textEn;
}
