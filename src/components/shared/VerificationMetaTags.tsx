import prisma from "@/lib/db/prisma";

// Server component that fetches and renders verification meta tags
export async function VerificationMetaTags() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: ["monetagMetaTag", "customVerificationMeta"],
        },
      },
    });

    const monetagMeta = settings.find((s) => s.key === "monetagMetaTag")?.value || "";
    const customMeta = settings.find((s) => s.key === "customVerificationMeta")?.value || "";

    // Parse meta tags from the saved values
    const metaTags: string[] = [];

    // Extract content from monetag meta tag
    if (monetagMeta) {
      const monetagMatch = monetagMeta.match(/content=["']([^"']+)["']/i);
      if (monetagMatch) {
        metaTags.push(`monetag:${monetagMatch[1]}`);
      }
    }

    // Parse custom meta tags
    if (customMeta) {
      const lines = customMeta.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        // Extract name and content from meta tag
        const nameMatch = line.match(/name=["']([^"']+)["']/i);
        const contentMatch = line.match(/content=["']([^"']+)["']/i);
        if (nameMatch && contentMatch) {
          metaTags.push(`${nameMatch[1]}:${contentMatch[1]}`);
        }
      }
    }

    if (metaTags.length === 0) {
      return null;
    }

    return (
      <>
        {metaTags.map((tag, index) => {
          const [name, content] = tag.split(":");
          return (
            <meta key={`verification-${index}`} name={name} content={content} />
          );
        })}
      </>
    );
  } catch (error) {
    console.error("Error fetching verification meta tags:", error);
    return null;
  }
}
