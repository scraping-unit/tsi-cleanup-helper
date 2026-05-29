export const MENU_PLATFORMS = [
	"Deliveroo",
	"UberEats",
	"JustEat",
	"Foodhub",
	"Wix",
	"Grub24",
	"PDF",
	"Image",
	"OwnWebsite",
	"Unknown",
] as const;

export type MenuPlatform = (typeof MENU_PLATFORMS)[number];

const IMAGE_EXTENSIONS = new Set([
	".avif",
	".gif",
	".jpeg",
	".jpg",
	".png",
	".svg",
	".webp",
]);

export function detectMenuPlatformFromUrl(url: string): MenuPlatform {
	const parsedUrl = parseUrl(url);

	if (!parsedUrl || !isHttpUrl(parsedUrl)) {
		return "Unknown";
	}

	const pathname = parsedUrl.pathname.toLowerCase();

	if (pathname.endsWith(".pdf")) {
		return "PDF";
	}

	if (hasImageExtension(pathname)) {
		return "Image";
	}

	const hostname = parsedUrl.hostname.toLowerCase();

	if (hostname.includes("deliveroo")) {
		return "Deliveroo";
	}

	if (hostname.includes("ubereats")) {
		return "UberEats";
	}

	if (hostname.includes("just-eat") || hostname.includes("justeat")) {
		return "JustEat";
	}

	if (hostname.includes("foodhub")) {
		return "Foodhub";
	}

	if (hostname.includes("wix")) {
		return "Wix";
	}

	if (hostname.includes("grub24")) {
		return "Grub24";
	}

	return "OwnWebsite";
}

function parseUrl(value: string): URL | null {
	const trimmedValue = value.trim();

	if (!trimmedValue) {
		return null;
	}

	try {
		return new URL(trimmedValue);
	} catch {
		// Fall back to bare hostnames such as "example.com/menu".
	}

	if (looksLikeBareHostnameUrl(trimmedValue)) {
		try {
			return new URL(`https://${trimmedValue}`);
		} catch {
			return null;
		}
	}

	return null;
}

function looksLikeBareHostnameUrl(value: string): boolean {
	if (/\s/.test(value)) {
		return false;
	}

	if (value.startsWith("/")) {
		return false;
	}

	return !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);
}

function isHttpUrl(url: URL): boolean {
	return url.protocol === "http:" || url.protocol === "https:";
}

function hasImageExtension(pathname: string): boolean {
	return Array.from(IMAGE_EXTENSIONS).some((extension) =>
		pathname.endsWith(extension),
	);
}
