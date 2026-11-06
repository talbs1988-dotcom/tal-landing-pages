import type { ComponentType } from "react";
import HeroAurora, { demo as HeroAuroraDemo } from "./HeroAurora";
import HeroSplit, { demo as HeroSplitDemo } from "./HeroSplit";
import PainCards, { demo as PainCardsDemo } from "./PainCards";
import TurnStatement, { demo as TurnStatementDemo } from "./TurnStatement";
import AboutAuthority, { demo as AboutAuthorityDemo } from "./AboutAuthority";
import SolutionBento, { demo as SolutionBentoDemo } from "./SolutionBento";
import LogoMarquee, { demo as LogoMarqueeDemo } from "./LogoMarquee";
import HowTimeline, { demo as HowTimelineDemo } from "./HowTimeline";
import ProofWall, { demo as ProofWallDemo } from "./ProofWall";
import PriceOffer, { demo as PriceOfferDemo } from "./PriceOffer";
import FaqAccordion, { demo as FaqAccordionDemo } from "./FaqAccordion";
import FormStage, { demo as FormStageDemo } from "./FormStage";

type Recipe = ComponentType<{ text: never }>;

/** כל המתכונים בגלריה, בסדר הרגיל של דף נחיתה */
export const RECIPES: { id: string; desc: string; Comp: Recipe; demo: object }[] = [
  { id: "HeroAurora", desc: "פתיחה כהה עם רקע חי", Comp: HeroAurora as Recipe, demo: HeroAuroraDemo as object },
  { id: "HeroSplit", desc: "פתיחה בהירה, טקסט ותמונה זה לצד זה", Comp: HeroSplit as Recipe, demo: HeroSplitDemo as object },
  { id: "PainCards", desc: "הכאב: כרטיסים שנכנסים בזה אחר זה", Comp: PainCards as Recipe, demo: PainCardsDemo as object },
  { id: "TurnStatement", desc: "נקודת מפנה: משפט גדול ותמונה שנחשפת", Comp: TurnStatement as Recipe, demo: TurnStatementDemo as object },
  { id: "AboutAuthority", desc: "מי אני: פורטרט ומספרים שרצים", Comp: AboutAuthority as Recipe, demo: AboutAuthorityDemo as object },
  { id: "SolutionBento", desc: "הפתרון: רשת כרטיסים עם הילה", Comp: SolutionBento as Recipe, demo: SolutionBentoDemo as object },
  { id: "LogoMarquee", desc: "הכלים או הלקוחות: פס לוגואים נע", Comp: LogoMarquee as Recipe, demo: LogoMarqueeDemo as object },
  { id: "HowTimeline", desc: "איך זה עובד: שלבים וקו שמתמלא", Comp: HowTimeline as Recipe, demo: HowTimelineDemo as object },
  { id: "ProofWall", desc: "המלצות: קיר צילומים נע וסרטונים", Comp: ProofWall as Recipe, demo: ProofWallDemo as object },
  { id: "PriceOffer", desc: "מחיר ודחיפות: כרטיס הצעה עם מסגרת זורמת", Comp: PriceOffer as Recipe, demo: PriceOfferDemo as object },
  { id: "FaqAccordion", desc: "שאלות ותשובות נפתחות", Comp: FaqAccordion as Recipe, demo: FaqAccordionDemo as object },
  { id: "FormStage", desc: "הטופס: במה כהה עם מסגרת מאירה", Comp: FormStage as Recipe, demo: FormStageDemo as object },
];
