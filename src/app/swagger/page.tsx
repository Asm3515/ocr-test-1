"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function SwaggerPage() {
  return (
    <div style={{ height: "100vh" }}>
      <style jsx global>{`
        .swagger-ui .scheme-container {
          display: none !important;
        }
      `}</style>

      <SwaggerUI
        url="/api/openapi"
        docExpansion="list"
        defaultModelsExpandDepth={0}
      />
    </div>
  );
}
