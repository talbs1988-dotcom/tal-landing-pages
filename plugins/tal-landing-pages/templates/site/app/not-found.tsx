import type { Metadata } from "next";
import Link from "next/link";

// Next.js מחזיר 404 ומוסיף noindex לבד
export const metadata: Metadata = {
  title: "הדף לא נמצא",
};

export default function NotFound() {
  return (
    <section className="px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-6xl font-bold text-primary" aria-hidden="true">
          404
        </p>
        <h1 className="mt-4 text-3xl font-bold">הדף לא נמצא</h1>
        <p className="mt-4 text-lg opacity-85">
          הדף הזה לא קיים, או שהכתובת השתנתה.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-white shadow-sm hover:brightness-110"
        >
          חזרה לדף הבית
        </Link>
      </div>
    </section>
  );
}
