/**
 * Registry format: skill-versions.json
 */
export interface Registry {
	$schema?: string;
	version: number;
	lastCheck?: string;
	products: Record<string, RegistryProduct>;
}

export interface RegistryProduct {
	displayName: string;
	package: string;
	verifiedVersion: string;
	verifiedAt: string;
	changelog?: string;
	skills: string[];
}
