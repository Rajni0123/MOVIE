import { Metadata } from "next";
import { getSettings } from "@/lib/settings";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://movpix.xyz";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: `Contact Us | ${settings.siteName}`,
    description: `Contact ${settings.siteName} for DMCA takedown requests, business inquiries, or support.`,
    alternates: {
      canonical: `${SITE_URL}/contact`,
    },
  };
}

export default async function ContactPage() {
  const settings = await getSettings();
  const siteName = settings.siteName || "MovPix";

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">
          Contact Us
        </h1>

        <div className="bg-zinc-900 rounded-lg p-6 md:p-8 space-y-6">
          <section>
            <p className="text-gray-300 leading-relaxed text-center mb-8">
              Have questions, feedback, or need to report an issue? We&apos;re here
              to help. Please use the information below to get in touch with us.
            </p>
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            <section className="bg-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-red-500">
                DMCA / Copyright Issues
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you believe your copyrighted content has been posted without
                authorization, please visit our{" "}
                <a
                  href="/dmca"
                  className="text-red-500 hover:text-red-400 underline"
                >
                  DMCA Policy
                </a>{" "}
                page for instructions on how to file a proper takedown notice.
              </p>
              <p className="text-gray-400 text-sm">
                Response time: 2-3 business days
              </p>
            </section>

            <section className="bg-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-red-500">
                General Inquiries
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                For general questions, feedback, or business inquiries, please
                reach out through our social media channels or email.
              </p>
              {settings.telegramUrl && (
                <a
                  href={settings.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.654-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.94z" />
                  </svg>
                  Telegram
                </a>
              )}
            </section>
          </div>

          <section className="border-t border-zinc-700 pt-6">
            <h2 className="text-xl font-semibold mb-4 text-red-500">
              Report Broken Links
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Found a broken download link? Please include the movie name and the
              specific link that&apos;s not working in your message. We&apos;ll try
              to fix it as soon as possible.
            </p>
          </section>

          <section className="bg-zinc-800 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold mb-4 text-white">
              Thank you for visiting {siteName}!
            </h2>
            <p className="text-gray-400">
              We appreciate your feedback and support.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
