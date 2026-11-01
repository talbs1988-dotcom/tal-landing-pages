"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type RefObject,
} from "react";
import { site } from "@/site.config";
import { g, pick } from "@/lib/copy";
import { validateLead } from "@/lib/lead";
import { readConsent } from "@/lib/consent";
import {
  NETWORK_ERROR,
  buildLeadPayload,
  interpretResponse,
  thankYouHref,
  type FieldName,
} from "@/lib/leadClient";
import { TODO, isFilled } from "@/lib/todo";
import { collectTracking } from "@/lib/tracking";
import type { TrackingKey } from "@/lib/utm";

/*
 * טופס הלידים. מופיע פעם אחת בדף, עם id="lead-form".
 * אסור להוריד: יידוע הפרטיות ליד הכפתור, תיבת הדיוור הנפרדת (לא מסומנת),
 * ושדה המלכודת לבוטים (website).
 * שולח ל-POST /api/lead לפי החוזה שב-lib/leadClient.ts.
 *
 * לפני שהדף סיים להיטען (hydration) כפתור השליחה נעול, ולטופס יש method="post".
 * כך שליחה רגילה של הדפדפן לא מכניסה שם, מייל וטלפון לכתובת.
 * הדף משתמש ב-LeadForm (components/LeadForm.tsx), שעוטף את הרכיב הזה.
 */

type FieldErrors = Partial<Record<FieldName, string>>;

const audience = site.audience;
const toYou = pick(g("אליך", "אלייך", "אליכם"), audience);
const FIELD_ORDER: FieldName[] = ["name", "email", "phone"];

/**
 * המשפט על מטא, כשהדיווח מהשרת (CAPI) פעיל. הוא נשלח רק עם תיבת הדיוור וגם עוגיות שיווק.
 * מתווסף אוטומטית גם כש-privacyNotice ב-config כבר מולא.
 */
const CAPI_SENTENCE =
  "סימון תיבת הדיוור, יחד עם אישור עוגיות שיווק, מעביר את המייל והטלפון בצורה מוצפנת (hash) למטא, למדידת הפרסום.";

function PrivacyNotice({ capi }: { capi: boolean }) {
  const meta = capi ? <> {CAPI_SENTENCE}</> : null;
  const policy = (
    <Link href="/privacy" className="font-medium underline underline-offset-2">
      מדיניות הפרטיות
    </Link>
  );
  if (isFilled(site.form.privacyNotice)) {
    return (
      <>
        {site.form.privacyNotice}
        {meta} לפרטים: {policy}.
      </>
    );
  }
  // ברירת מחדל עד שהטקסט ב-config מולא. הסימון TODO נשאר גלוי בכוונה
  const items =
    site.form.phone === "hidden" ? "השם והמייל" : "השם, המייל והטלפון";
  return (
    <>
      {items} נאספים כדי לחזור {toYou} בנוגע לפנייה. המסירה אינה חובה לפי חוק,
      אבל בלי הפרטים לא נוכל לחזור {toYou}. הפרטים נשמרים אצל{" "}
      {site.business.displayName} ומועברים גם ל-{TODO}.{meta} לפרטים: {policy}.
    </>
  );
}

function Field(props: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  input: InputHTMLAttributes<HTMLInputElement>;
}) {
  const errorId = `${props.id}-error`;
  return (
    <div>
      <label htmlFor={props.id} className="mb-1.5 block font-medium">
        {props.label}
        {props.hint && (
          <span className="font-normal"> {props.hint}</span>
        )}
      </label>
      <input
        {...props.input}
        id={props.id}
        ref={props.inputRef}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={errorId}
        className={`block min-h-12 w-full rounded-lg border bg-white px-4 py-2.5 text-base ${
          props.error ? "border-red-700" : "border-black/25"
        }`}
      />
      <p
        id={errorId}
        aria-live="polite"
        className="mt-1.5 min-h-5 text-sm font-medium text-red-700"
      >
        {props.error}
      </p>
    </div>
  );
}

export function LeadFormClient({ capi }: { capi: boolean }) {
  const router = useRouter();
  const uid = useId();
  const ids = {
    name: `${uid}-name`,
    email: `${uid}-email`,
    phone: `${uid}-phone`,
    consent: `${uid}-consent`,
    website: `${uid}-website`,
    privacy: `${uid}-privacy`,
  };

  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
  });
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // false ב-HTML מהשרת. הכפתור נפתח רק כשה-JS של הטופס רץ
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const refs: Record<FieldName, RefObject<HTMLInputElement | null>> = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
  };
  const tracking = useRef<Record<TrackingKey, string> | null>(null);
  const eventId = useRef<string | undefined>(undefined);

  // מקור התנועה נאסף כשהדף נטען (הכתובת שבה הגולש נחת)
  useEffect(() => {
    tracking.current = collectTracking({
      search: window.location.search,
      pathname: window.location.pathname,
      cookie: document.cookie,
      referrer: document.referrer,
    });
  }, []);

  function focusFirst(errs: FieldErrors) {
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (first) refs[first].current?.focus();
  }

  function update(field: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (field !== "website" && errors[field])
      setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFormError("");

    const input = { ...values, marketingConsent };
    const check = validateLead(input, site.form);
    if (!check.ok && "errors" in check) {
      const { form, ...fields } = check.errors;
      setErrors(fields);
      if (form) setFormError(form);
      focusFirst(fields);
      return;
    }
    setErrors({});
    setSubmitting(true);

    // אותו מזהה גם בניסיון חוזר, כדי שמטא לא תספור פעמיים
    if (
      !eventId.current &&
      typeof crypto !== "undefined" &&
      "randomUUID" in crypto
    ) {
      eventId.current = crypto.randomUUID();
    }
    // ההסכמה לעוגיות נקראת ברגע השליחה. בלי הסכמה לשיווק: בלי מזהי העוגיות של מטא,
    // והשרת לא מדווח למטא (CAPI) גם אם סומנה תיבת הדיוור
    const payload = buildLeadPayload({
      values,
      marketingConsent,
      eventId: eventId.current,
      tracking: tracking.current,
      cookie: document.cookie,
      cookieMarketing: readConsent()?.marketing,
    });

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        // לא JSON: interpretResponse מחזיר הודעה כללית
      }
      const outcome = interpretResponse(res.status, json);
      if (outcome.kind === "success") {
        // הכפתור נשאר נעול עד המעבר, כדי שלא ישלחו פעמיים
        router.push(thankYouHref(outcome.eventId));
        return;
      }
      if (outcome.kind === "fieldErrors") {
        setErrors(outcome.errors);
        focusFirst(outcome.errors);
      } else {
        setFormError(outcome.message);
      }
    } catch {
      setFormError(NETWORK_ERROR);
    }
    setSubmitting(false);
  }

  return (
    <form
      id="lead-form"
      method="post"
      tabIndex={-1}
      noValidate
      onSubmit={onSubmit}
      aria-busy={submitting}
      className="scroll-mt-8 space-y-4 text-start"
    >
      <Field
        id={ids.name}
        label="שם מלא"
        error={errors.name}
        inputRef={refs.name}
        input={{
          name: "name",
          type: "text",
          autoComplete: "name",
          required: true,
          maxLength: 80,
          value: values.name,
          onChange: (e) => update("name", e.target.value),
        }}
      />
      <Field
        id={ids.email}
        label="אימייל"
        error={errors.email}
        inputRef={refs.email}
        input={{
          name: "email",
          type: "email",
          autoComplete: "email",
          inputMode: "email",
          dir: "ltr",
          placeholder: "name@example.com",
          required: true,
          maxLength: 254,
          value: values.email,
          onChange: (e) => update("email", e.target.value),
        }}
      />
      {site.form.phone !== "hidden" && (
        <Field
          id={ids.phone}
          label="טלפון"
          hint={site.form.phone === "optional" ? "(לא חובה)" : undefined}
          error={errors.phone}
          inputRef={refs.phone}
          input={{
            name: "phone",
            type: "tel",
            autoComplete: "tel",
            inputMode: "tel",
            dir: "ltr",
            placeholder: "050-1234567",
            required: site.form.phone === "required",
            maxLength: 30,
            value: values.phone,
            onChange: (e) => update("phone", e.target.value),
          }}
        />
      )}

      {/* מלכודת בוטים: מוסתר מהעין ומקוראי מסך. אדם לא ממלא אותו */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={ids.website}>אתר אינטרנט</label>
        <input
          id={ids.website}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => update("website", e.target.value)}
        />
      </div>

      {/* הסכמה לדיוור: נפרדת, לא מסומנת, ולא חובה (חוק התקשורת סעיף 30א) */}
      <div className="flex items-start gap-3 rounded-lg border border-black/10 p-3">
        <input
          id={ids.consent}
          name="marketingConsent"
          type="checkbox"
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-primary"
        />
        <label htmlFor={ids.consent} className="text-sm">
          {site.form.marketingConsentText}
        </label>
      </div>

      <div role="alert" className="min-h-0 text-sm font-medium text-red-700">
        {formError}
      </div>

      <button
        type="submit"
        disabled={!hydrated || submitting}
        aria-describedby={ids.privacy}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
      >
        {submitting ? "שולחים…" : site.form.submitLabel}
      </button>

      <p id={ids.privacy} className="text-xs leading-relaxed">
        <PrivacyNotice capi={capi} />
      </p>
    </form>
  );
}
