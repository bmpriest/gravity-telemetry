export const origins: Readonly<Record<string, string>> = {
  "http://localhost:3000": "L",
  "https://beta.gravityassist.xyz": "B",
  "https://gravityassist.xyz": "P"
};

export function getOrigin(baseUrl: string): string {
  return origins[baseUrl] ?? "U";
}
