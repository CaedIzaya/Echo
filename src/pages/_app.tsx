import { SessionProvider } from "next-auth/react";
import { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import { inferFeatureFromPath, startSessionHeartbeat, trackEvent } from "~/lib/analytics";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      const path = url.split("?")[0];
      trackEvent({
        name: "page_view",
        page: path,
        feature: inferFeatureFromPath(path),
        action: "view",
      });
    };

    handleRouteChange(router.pathname);
    router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router]);

  useEffect(() => {
    const stop = startSessionHeartbeat();
    return () => stop();
  }, []);

  return (
    <ErrorBoundary>
      <SessionProvider session={pageProps.session}>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <Component {...pageProps} />
      </SessionProvider>
    </ErrorBoundary>
  );
}
