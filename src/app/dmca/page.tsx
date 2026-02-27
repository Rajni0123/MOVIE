import { Metadata } from "next";
import { getSettings } from "@/lib/settings";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://movpix.xyz";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: `DMCA Policy | ${settings.siteName}`,
    description: `DMCA Copyright Policy for ${settings.siteName}. Learn how to file a DMCA takedown notice.`,
    alternates: {
      canonical: `${SITE_URL}/dmca`,
    },
  };
}

export default async function DMCAPage() {
  const settings = await getSettings();
  const siteName = settings.siteName || "MovPix";
  const siteUrl = settings.siteUrl || SITE_URL;
  const domain = new URL(siteUrl).hostname;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">
          DMCA Policy
        </h1>

        <div className="bg-zinc-900 rounded-lg p-6 md:p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-4 text-red-500">
              Copyright Infringement Notice
            </h2>
            <p className="text-gray-300 leading-relaxed">
              It is our policy to respond to clear notices of alleged copyright
              infringement. If you believe that your intellectual property rights
              have been infringed upon by one of our users, we need you to send us
              a proper notification. All notices should comply with the
              notification requirements of the DMCA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-red-500">
              Required Information
            </h2>
            <p className="text-gray-300 mb-4">
              You MUST provide the following information:
            </p>
            <ol className="list-decimal list-inside space-y-4 text-gray-300">
              <li>
                <span className="font-medium text-white">Identify yourself as either:</span>
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>The owner of a copyrighted work(s), or</li>
                  <li>
                    A person &quot;authorized to act on behalf of the owner of an
                    exclusive right that is allegedly infringed.&quot;
                  </li>
                </ul>
              </li>
              <li>
                <span className="font-medium text-white">
                  Identify the copyrighted work
                </span>{" "}
                claimed to have been infringed.
              </li>
              <li>
                <span className="font-medium text-white">
                  Identify the infringing material
                </span>{" "}
                that is claimed to be infringing or to be the subject of the
                infringing activity and that is to be removed or access to which
                is to be disabled by providing us the exact location of the
                infringing file with the exact link.
              </li>
              <li>
                <span className="font-medium text-white">
                  Provide the web address
                </span>{" "}
                under which the link has been published.
              </li>
              <li>
                <span className="font-medium text-white">
                  Provide your contact information
                </span>{" "}
                which includes your full name, address, and telephone number.
              </li>
            </ol>
            <p className="text-gray-400 text-sm mt-4">
              (For more details on the information required for valid notification,
              see 17 U.S.C. 512(c)(3).)
            </p>
          </section>

          <section className="bg-zinc-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-3 text-yellow-500">
              Important Warning
            </h2>
            <p className="text-gray-300 leading-relaxed">
              You should be aware that, under the DMCA, claimants who make
              misrepresentations concerning copyright infringement may be liable
              for damages incurred as a result of the removal or blocking of the
              material, court costs, and attorneys fees.
            </p>
            <p className="text-red-400 font-medium mt-3">
              A proper notification MUST contain the information above, or it may
              be IGNORED.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-red-500">
              How to Submit a Notice
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Send notifications to:{" "}
              <a
                href="/contact"
                className="text-red-500 hover:text-red-400 underline"
              >
                Contact Us Page
              </a>
            </p>
            <p className="text-gray-400 mt-3">
              Please allow 2-3 business days for an email response. Note that
              emailing your complaint to other parties such as our Internet
              Service Provider will not expedite your request and may result in a
              delayed response due to the complaint not properly being filed.
            </p>
          </section>

          <section className="border-t border-zinc-700 pt-6">
            <h2 className="text-xl font-semibold mb-4 text-red-500">
              Disclaimer
            </h2>
            <p className="text-gray-300 leading-relaxed">
              <span className="font-semibold text-white">{domain}</span> does not
              host any files on its servers. All points to content hosted on third
              party websites.{" "}
              <span className="font-semibold text-white">{siteName}</span> does
              not accept responsibility for content hosted on third party websites
              and does not have any involvement in the same.
            </p>
          </section>

          <section className="bg-zinc-800 rounded-lg p-4 mt-6">
            <p className="text-gray-400 text-sm text-center">
              This page was last updated on {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
