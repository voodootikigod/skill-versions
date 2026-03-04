/**
 * Registry format: skills-check.json
 */
export interface Registry {
	$schema?: string;
	lastCheck?: string;
	products: Record<string, RegistryProduct>;
	skillsDir?: string;
	version: number;
}

export interface RegistryProduct {
	agents?: string[];
	changelog?: string;
	displayName: string;
	package: string;
	skills: string[];
	verifiedAt: string;
	verifiedVersion: string;
}
