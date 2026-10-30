export const MARKETING_TITLES: Record<string, string> = {
  "/welcome": "KenManage",
  "/guide": "Guide · KenManage",
  "/faq": "FAQ · KenManage",
  "/contact": "Contact · KenManage",
  "/license": "License · KenManage",
  // Redirect aliases (must stay public)
  "/about": "KenManage",
  "/features": "KenManage",
};

export function isMarketingPath(pathname: string) {
  return Object.prototype.hasOwnProperty.call(MARKETING_TITLES, pathname);
}
