/**
 * The founder's personal build (eas build --profile personal) gets its own app id and name,
 * so it can sit beside the public app on the same phone without either replacing the other.
 * Everything else comes from app.json.
 */
const IS_PERSONAL = process.env.APP_VARIANT === "personal";

module.exports = ({ config }) =>
  IS_PERSONAL
    ? {
        ...config,
        name: "أدرك عمرك · شخصي",
        android: { ...config.android, package: "com.adrikomrak.app.personal" },
      }
    : config;
