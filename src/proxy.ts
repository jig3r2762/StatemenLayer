import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/demo(.*)",             // no-signup demo page
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/r/(.*)",               // public tokenized web-view
  "/api/demo/(.*)",        // demo parse endpoint — no auth
  "/api/webhooks/(.*)",    // Stripe + Resend webhooks (verify internally)
  "/sitemap.xml",
  "/robots.txt",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
