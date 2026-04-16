import posthog from "posthog-js";

posthog.init("phc_oSZ5qXuigQ79ftoMpLupHurAtydnBFE4Ybz43pjuWEvc", {
  api_host: "https://eu.i.posthog.com",
  defaults: "2026-01-30",
  person_profiles: "identified_only",
});

export default posthog;
