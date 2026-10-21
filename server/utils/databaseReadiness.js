export function getDatabaseReadiness(readyState) {
  if (readyState !== 1) {
    return {
      httpStatus: 503,
      body: {
        success: false,
        service: "SHIVASHA API",
        status: "not-ready",
        database: "not-connected"
      }
    };
  }

  return {
    httpStatus: 200,
    body: {
      success: true,
      service: "SHIVASHA API",
      status: "ready",
      database: "connected"
    }
  };
}
