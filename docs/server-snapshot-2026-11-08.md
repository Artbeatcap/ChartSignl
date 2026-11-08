# Server snapshot 2026-11-08

Branch: `server-snapshot/2026-11-08`

Counts from `git rev-list --left-right --count HEAD...origin/main` (left = commits on this snapshot that are not in origin/main, right = commits on origin/main that are not in this snapshot):

- ahead of origin/main: 1
- behind origin/main: 36

## git diff --stat origin/main...HEAD

```
 -C                                                 |   Bin 0 -> 2560 bytes
 .claude/launch.json                                |    23 +
 .cursor/settings.json                              |     7 +
 .gitignore                                         |    21 +
 .npmrc                                             |     1 +
 .prettierrc                                        |    14 +-
 DEPLOY.md                                          |   433 +
 README.md                                          |   418 +-
 app.json                                           |    70 +-
 apps/backend/.env.example                          |   132 +-
 apps/backend/Dockerfile                            |   140 +-
 apps/backend/assets/Inter-SemiBold.ttf             |   Bin 0 -> 862936 bytes
 apps/backend/deploy/deploy.sh                      |   174 +-
 apps/backend/deploy/docker-compose.yml             |    56 +-
 apps/backend/deploy/nginx-api.conf                 |   118 +-
 apps/backend/deploy/nginx-n8n.conf                 |    87 +
 apps/backend/deploy/nginx-web.conf                 |   223 +-
 .../fixtures/alphavantage_earnings_2026-09.csv     |     6 +
 apps/backend/fixtures/daily_content_sample.json    |    45 +
 .../backend/fixtures/finnhub_earnings_2026-09.json |    44 +
 .../fixtures/fmp_earnings_stable_2026-09-01.json   |    38 +
 .../fixtures/fmp_earnings_week_2026-08-31.json     |    68 +
 apps/backend/fixtures/massive_news_avgo.json       |   120 +
 apps/backend/fixtures/weekly_content_sample.json   |    44 +
 apps/backend/package.json                          |    19 +-
 apps/backend/scripts/daily-brief-acceptance.ts     |   120 +
 apps/backend/scripts/refresh-earnings-calendar.ts  |    15 +
 apps/backend/scripts/test-alert-trigger.ts         |   138 +
 apps/backend/scripts/weekly-brief-acceptance.ts    |    97 +
 apps/backend/scripts/weekly-brief-integration.ts   |    83 +
 apps/backend/src/index.ts                          |   404 +-
 apps/backend/src/lib/__tests__/breadth.test.ts     |   119 +
 apps/backend/src/lib/__tests__/catalyst.test.ts    |   140 +
 apps/backend/src/lib/__tests__/eyeballLevels.ts    |   168 +
 .../src/lib/__tests__/feedFreshness.test.ts        |    67 +
 apps/backend/src/lib/__tests__/guestUsage.test.ts  |    55 +
 .../backend/src/lib/__tests__/indexDrivers.test.ts |   190 +
 .../src/lib/__tests__/levelRelevance.test.ts       |   324 +
 .../src/lib/__tests__/marketContext.test.ts        |   193 +
 .../backend/src/lib/__tests__/moversFilter.test.ts |   355 +
 .../lib/__tests__/moversFilter.test.ts.bak.premkt  |   193 +
 apps/backend/src/lib/__tests__/newsletter.test.ts  |   596 +
 apps/backend/src/lib/__tests__/openaiGuard.test.ts |   211 +
 .../backend/src/lib/__tests__/reelsPublish.test.ts |   172 +
 apps/backend/src/lib/__tests__/setupEnv.ts         |     7 +
 apps/backend/src/lib/__tests__/weekAhead.test.ts   |   469 +
 apps/backend/src/lib/analysisConstants.ts          |   376 +-
 apps/backend/src/lib/analysisGuide.ts              |   139 +
 apps/backend/src/lib/atlasFeed.ts                  |    61 +
 apps/backend/src/lib/breadth.ts                    |    71 +
 apps/backend/src/lib/briefSanitize.ts              |    33 +
 apps/backend/src/lib/calendarSchedule.ts           |    23 +
 apps/backend/src/lib/catalyst.ts                   |    94 +
 apps/backend/src/lib/confluenceScorer.ts           |  1391 +-
 apps/backend/src/lib/earningsCalendarRefresh.ts    |   176 +
 apps/backend/src/lib/email.ts                      |    53 +
 apps/backend/src/lib/feedFreshness.ts              |   229 +
 apps/backend/src/lib/fmpEarningsAdapter.ts         |   136 +
 apps/backend/src/lib/growthhub.ts                  |   120 +
 apps/backend/src/lib/guestUsage.ts                 |    87 +
 apps/backend/src/lib/indexDrivers.ts               |   235 +
 apps/backend/src/lib/levelRelevance.ts             |   430 +
 apps/backend/src/lib/marketContext.ts              |   129 +
 apps/backend/src/lib/marketDataFetcher.ts          |   102 +
 apps/backend/src/lib/moversFilter.ts               |   122 +
 apps/backend/src/lib/moversFilter.ts.bak.premkt    |   118 +
 apps/backend/src/lib/newsletter.ts                 |   612 +
 apps/backend/src/lib/newsletterPages.ts            |   106 +
 apps/backend/src/lib/newsletterRateLimit.ts        |    38 +
 apps/backend/src/lib/newsletterSend.ts             |   348 +
 apps/backend/src/lib/newsletterWebhook.ts          |    75 +
 apps/backend/src/lib/openai.ts                     |   384 +-
 apps/backend/src/lib/openaiGuard.ts                |   144 +
 apps/backend/src/lib/postingMode.ts                |    71 +
 apps/backend/src/lib/premarketMovers.ts            |    95 +
 apps/backend/src/lib/reelsCode.ts                  |   135 +
 apps/backend/src/lib/reelsPages.ts                 |    56 +
 apps/backend/src/lib/reelsPublisher.ts             |   119 +
 apps/backend/src/lib/resolverSchedule.ts           |    19 +
 apps/backend/src/lib/revenuecat.ts                 |   164 +
 apps/backend/src/lib/runAtlasAnalysis.ts           |   515 +
 apps/backend/src/lib/runPrediction.ts              |   177 +
 apps/backend/src/lib/socialContent.ts              |   259 +
 apps/backend/src/lib/supabase.ts                   |   132 +-
 apps/backend/src/lib/technicalCalculator.ts        |  1855 +-
 apps/backend/src/lib/tickerMeta.ts                 |   176 +
 apps/backend/src/lib/volatilityCone.ts             |    79 +
 apps/backend/src/lib/weekAhead.ts                  |   601 +
 apps/backend/src/lib/weekAheadLoad.ts              |   260 +
 apps/backend/src/prompts/chartAnalysis.ts          |   334 +-
 apps/backend/src/prompts/prediction.ts             |    29 +
 apps/backend/src/routes/analyzeData.ts             |   690 +-
 apps/backend/src/routes/analyzeGuest.ts            |   138 +
 apps/backend/src/routes/auth.ts                    |    44 +
 apps/backend/src/routes/dailyBrief.ts              |   277 +
 apps/backend/src/routes/delete-account.ts          |   145 +
 apps/backend/src/routes/history.ts                 |   380 +-
 apps/backend/src/routes/internalSignals.ts         |   142 +
 apps/backend/src/routes/marketData.ts              |   732 +-
 apps/backend/src/routes/newsletter.ts              |   325 +
 apps/backend/src/routes/notifications.ts           |   374 +
 apps/backend/src/routes/predict.ts                 |   123 +
 apps/backend/src/routes/predictions.ts             |   421 +
 apps/backend/src/routes/reels.ts                   |   201 +
 apps/backend/src/routes/social.ts                  |    46 +
 apps/backend/src/routes/subscription.ts            |   326 +-
 apps/backend/src/routes/test-alert.ts              |   150 +
 apps/backend/src/routes/user.ts                    |   434 +-
 apps/backend/src/routes/webhooks.ts                |    88 +
 apps/backend/src/routes/weeklyBrief.ts             |   217 +
 apps/backend/src/services/atlasLink.ts             |    67 +
 apps/backend/src/services/briefShared/emailCss.ts  |    44 +
 apps/backend/src/services/briefShared/emailText.ts |    71 +
 .../src/services/briefShared/parseGeneratedAt.ts   |    17 +
 .../dailyBrief/__tests__/freshness.test.ts         |    46 +
 apps/backend/src/services/dailyBrief/alert.ts      |    20 +
 apps/backend/src/services/dailyBrief/brand.ts      |    18 +
 apps/backend/src/services/dailyBrief/freshness.ts  |    59 +
 .../backend/src/services/dailyBrief/renderEmail.ts |   535 +
 .../services/dailyBrief/renderEmail.ts.bak.premkt  |   414 +
 apps/backend/src/services/dailyBrief/sendEmail.ts  |   164 +
 apps/backend/src/services/dailyBrief/store.ts      |    58 +
 apps/backend/src/services/dailyBrief/types.ts      |    13 +
 apps/backend/src/services/dailyBrief/validate.ts   |    85 +
 .../src/services/dailyBrief/validate.ts.bak.premkt |    77 +
 .../services/earnings/__tests__/providers.test.ts  |    84 +
 .../services/earnings/__tests__/resolve.test.ts    |    86 +
 apps/backend/src/services/earnings/csv.ts          |    65 +
 apps/backend/src/services/earnings/news.ts         |   211 +
 .../services/earnings/providers/alphaVantage.ts    |    72 +
 .../src/services/earnings/providers/finnhub.ts     |    79 +
 .../backend/src/services/earnings/providers/fmp.ts |    58 +
 .../src/services/earnings/providers/index.ts       |     3 +
 apps/backend/src/services/earnings/resolve.ts      |   127 +
 apps/backend/src/services/earnings/types.ts        |   102 +
 apps/backend/src/services/predictionResolver.ts    |   344 +
 .../src/services/pushNotificationService.ts        |   577 +
 apps/backend/src/services/weeklyBrief/alert.ts     |    20 +
 apps/backend/src/services/weeklyBrief/brand.ts     |    43 +
 apps/backend/src/services/weeklyBrief/freshness.ts |    35 +
 .../src/services/weeklyBrief/renderEmail.ts        |   395 +
 apps/backend/src/services/weeklyBrief/sendEmail.ts |   119 +
 apps/backend/src/services/weeklyBrief/store.ts     |    58 +
 apps/backend/src/services/weeklyBrief/types.ts     |    12 +
 apps/backend/src/services/weeklyBrief/validate.ts  |    70 +
 apps/backend/tsconfig.json                         |    30 +-
 apps/mobile/.easignore                             |     2 +
 apps/mobile/.env.example                           |    12 +-
 apps/mobile/.gitignore                             |    30 +-
 apps/mobile/ANDROID_SIGNING.md                     |    94 +
 apps/mobile/app.config.ts                          |   222 +-
 apps/mobile/assets/README.md                       |   158 +-
 apps/mobile/assets/adaptive-icon.png               |   Bin 50282 -> 30962 bytes
 apps/mobile/assets/icon.png                        |   Bin 50282 -> 38701 bytes
 apps/mobile/assets/logo.svg                        |    42 +-
 apps/mobile/assets/splash.png                      |   Bin 0 -> 110670 bytes
 apps/mobile/babel.config.js                        |     9 +-
 apps/mobile/dist.tar.gz                            |   Bin 0 -> 3014023 bytes
 apps/mobile/eas.json                               |    47 +
 apps/mobile/entry.js                               |     2 +
 apps/mobile/google-services.json.example           |    29 +
 apps/mobile/metro.config.js                        |    33 +-
 apps/mobile/package.json                           |    56 +-
 apps/mobile/plugins/verify-prebuild.js             |   257 +
 .../plugins/withBuildGradleCustomizations.js       |    44 +
 apps/mobile/plugins/withCustomTheme.js             |    45 +
 apps/mobile/plugins/withGoogleServices.js          |    80 +
 apps/mobile/plugins/withGradleConfig.js            |   106 +
 apps/mobile/plugins/withMonorepoConfig.js          |    85 +
 apps/mobile/plugins/withProguardRules.js           |    47 +
 apps/mobile/plugins/withReleaseSigning.js          |   138 +
 apps/mobile/public/favicon.svg                     |    42 +-
 apps/mobile/public/site.webmanifest                |    38 +-
 apps/mobile/scripts/bundle-from-mobile.js          |    21 +
 apps/mobile/scripts/copy-google-services.js        |    23 +
 apps/mobile/scripts/generate-assets.js             |   120 +-
 apps/mobile/scripts/prebuild-eas.js                |    19 +
 apps/mobile/scripts/prebuild.js                    |   146 +
 apps/mobile/scripts/setup-android-fcm.ps1          |    27 +
 apps/mobile/scripts/setup-ios-push.ps1             |    43 +
 apps/mobile/scripts/setup-signing.js               |   149 +
 apps/mobile/src/app/(onboarding)/_layout.tsx       |    43 +-
 apps/mobile/src/app/(onboarding)/account.tsx       |  1131 +-
 apps/mobile/src/app/(onboarding)/experience.tsx    |    12 +-
 .../src/app/(onboarding)/forgot-password.tsx       |   306 +
 apps/mobile/src/app/(onboarding)/home.tsx          |   283 +
 .../mobile/src/app/(onboarding)/stress-reducer.tsx |    12 +-
 apps/mobile/src/app/(onboarding)/style.tsx         |    24 +-
 apps/mobile/src/app/(onboarding)/welcome.tsx       |   211 +-
 apps/mobile/src/app/(settings)/_layout.tsx         |     3 +-
 apps/mobile/src/app/(settings)/change-password.tsx |   431 +
 .../mobile/src/app/(settings)/data-disclosures.tsx |   177 +
 apps/mobile/src/app/(settings)/edit-profile.tsx    |   600 +-
 apps/mobile/src/app/(settings)/help.tsx            |   627 +-
 apps/mobile/src/app/(settings)/notifications.tsx   |   508 +-
 apps/mobile/src/app/(settings)/privacy.tsx         |   585 +-
 apps/mobile/src/app/(settings)/terms.tsx           |    12 +-
 apps/mobile/src/app/(tabs)/_layout.tsx             |   169 +-
 apps/mobile/src/app/(tabs)/alerts.tsx              |   543 +
 apps/mobile/src/app/(tabs)/analyze.tsx             |  1780 ++
 apps/mobile/src/app/(tabs)/history.tsx             |   323 +-
 apps/mobile/src/app/(tabs)/home.tsx                |  2010 +-
 apps/mobile/src/app/(tabs)/profile.tsx             |  1574 +-
 apps/mobile/src/app/_layout.tsx                    |   344 +-
 apps/mobile/src/app/auth/callback.tsx              |   678 +-
 apps/mobile/src/app/auth/reset-password.tsx        |   473 +
 apps/mobile/src/app/index.tsx                      |   203 +-
 apps/mobile/src/app/notification-settings.tsx      |   574 +
 apps/mobile/src/app/open-app.tsx                   |     6 +
 apps/mobile/src/app/premium.tsx                    |    10 +-
 apps/mobile/src/components/AppleLogo.tsx           |    18 +
 apps/mobile/src/components/Button.tsx              |   297 +-
 apps/mobile/src/components/Card.tsx                |   106 +-
 apps/mobile/src/components/ChartOverlay.tsx        |   694 +-
 apps/mobile/src/components/DataFreshnessBadge.tsx  |   133 +
 apps/mobile/src/components/DataFreshnessSheet.tsx  |   222 +
 .../src/components/EmailVerificationBanner.tsx     |   278 +-
 apps/mobile/src/components/GoogleLogo.tsx          |    34 +
 apps/mobile/src/components/Input.tsx               |   160 +-
 apps/mobile/src/components/NewsletterSignup.tsx    |   267 +
 apps/mobile/src/components/PredictionSummary.tsx   |    96 +
 apps/mobile/src/components/ProgressIndicator.tsx   |   194 +-
 apps/mobile/src/components/SelectableChip.tsx      |   184 +-
 apps/mobile/src/components/StockChart.tsx          |  2141 +-
 apps/mobile/src/components/SymbolSearch.tsx        |   727 +-
 .../src/components/chart/ChartLayerToggles.tsx     |   178 +
 apps/mobile/src/components/chart/VolumeBars.tsx    |    90 +
 apps/mobile/src/components/chart/VolumeProfile.tsx |   118 +
 apps/mobile/src/components/chart/index.ts          |     6 +
 .../education/AnalysisEducationFooter.tsx          |   241 +
 .../src/components/education/EducationProvider.tsx |    89 +
 .../src/components/education/EducationSheet.tsx    |   345 +
 .../mobile/src/components/education/InfoButton.tsx |   106 +
 apps/mobile/src/components/education/index.ts      |     7 +
 apps/mobile/src/components/index.ts                |    24 +-
 .../src/components/screens/PremiumScreen.tsx       |   289 +-
 apps/mobile/src/hooks/useAlerts.ts                 |   259 +
 apps/mobile/src/lib/api.ts                         |   404 +-
 apps/mobile/src/lib/apiConfig.ts                   |    49 +
 apps/mobile/src/lib/atlasError.ts                  |    16 +
 apps/mobile/src/lib/chartAnalysis.ts               |   360 +-
 apps/mobile/src/lib/marketData.ts                  |   168 +-
 apps/mobile/src/lib/pushDebug.ts                   |    95 +
 apps/mobile/src/lib/supabase.ts                    |   205 +-
 apps/mobile/src/lib/usage.ts                       |    29 +
 apps/mobile/src/lib/usePushNotifications.ts        |   271 +
 apps/mobile/src/services/subscription.service.ts   |   104 +-
 apps/mobile/src/store/analysisStore.ts             |   110 +-
 apps/mobile/src/store/authStore.ts                 |   275 +-
 apps/mobile/src/store/chartLayerStore.ts           |    53 +
 apps/mobile/src/store/marketDataStore.ts           |    12 +
 apps/mobile/src/store/onboardingStore.ts           |   154 +-
 apps/mobile/src/theme/index.ts                     |   446 +-
 apps/mobile/static/confirm-deletion.html           |   140 +
 apps/mobile/static/data-deletion.html              |   139 +
 apps/mobile/static/home.html                       |   327 +
 apps/mobile/static/landing.html                    |  1540 ++
 apps/mobile/static/logo.png                        |   Bin 0 -> 18181 bytes
 apps/mobile/static/logo.svg                        |    21 +
 apps/mobile/static/privacy.html                    |   353 +
 apps/mobile/static/terms.html                      |   336 +
 apps/mobile/tailwind.config.js                     |   170 +-
 apps/mobile/tsconfig.json                          |    34 +-
 apps/mobile/web.tar.gz                             |   Bin 0 -> 3014023 bytes
 atlas-system-prompt.ts                             |    76 +
 body.txt                                           |     2 +
 claude/daily-brief-notable-movers-fix.md           |   259 +
 claude/newsletter-signup.md                        |    20 +
 claude/reels-publish-endpoint.md                   |    52 +
 claude/reels-runbook.md                            |    26 +
 config/posting.json                                |     8 +
 deploy-production.ps1                              |   363 +
 deploy-production.sh                               |   163 +
 deploy-web.ps1                                     |   232 +
 deploy.ps1                                         |   153 +
 deploy/nginx.conf                                  |   182 +-
 .../.well-known/apple-app-site-association         |    20 +
 deploy/web-static/open-app.html                    |    64 +
 docker-compose.yml                                 |    76 +-
 docs/MOBILE-PUSH-VERIFICATION.md                   |   104 +
 download-remote-env.ps1                            |    19 +
 eas.json                                           |    21 +
 edit-remote-env.ps1                                |    57 +
 fix-naked-domain-redirect.sh                       |   125 +
 generate-apple-secret.mjs                          |    71 +
 market-alerts/deploy/.gitignore                    |     1 +
 market-alerts/deploy/Dockerfile                    |    66 +
 market-alerts/deploy/docker-compose.yml            |    40 +
 market-alerts/deploy/nginx-n8n-personal.conf       |    45 +
 market-alerts/deploy/server-env.sh                 |    23 +
 market-alerts/transcripts/bin/cli.mjs              |   132 +
 market-alerts/transcripts/lib/feeds.js             |   197 +
 market-alerts/transcripts/lib/run.js               |   858 +
 market-alerts/transcripts/lib/vtt.js               |   164 +
 .../transcripts/scripts/build-workflow.mjs         |  1056 +
 market-alerts/transcripts/sources.json             |     6 +
 market-alerts/transcripts/test/feeds.test.js       |   100 +
 .../test/fixtures/podcast-with-transcript.xml      |    15 +
 .../test/fixtures/podcast-without-transcript.xml   |    20 +
 .../test/fixtures/provider-supadata.json           |    10 +
 .../test/fixtures/provider-transcriptapi.json      |    10 +
 market-alerts/transcripts/test/fixtures/sample.vtt |    16 +
 .../transcripts/test/fixtures/youtube-feed.xml     |    23 +
 market-alerts/transcripts/test/run.test.js         |   242 +
 market-alerts/transcripts/test/vtt.test.js         |    71 +
 market-alerts/transcripts/test/workflow.test.js    |    73 +
 metro.config.js                                    |     6 +
 package-lock.json                                  | 21239 ++++++++-----------
 package.json                                       |    29 +-
 packages/core/package.json                         |    77 +-
 packages/core/src/content/indicatorEducation.ts    |   490 +
 packages/core/src/index.js                         |    77 +-
 packages/core/src/index.ts                         |   125 +-
 packages/core/src/lib/dailyHighlight.ts            |    69 +
 packages/core/src/lib/predictionCard.ts            |    96 +
 packages/core/src/lib/predictionChart.ts           |    98 +
 packages/core/src/lib/trackRecord.ts               |    31 +
 .../core/src/types/__tests__/dataFreshness.test.ts |   140 +
 packages/core/src/types/api.js                     |   122 +-
 packages/core/src/types/api.ts                     |   125 +-
 packages/core/src/types/chartAnalysis.js           |   342 +-
 packages/core/src/types/chartAnalysis.ts           |   348 +-
 packages/core/src/types/dailyBrief.ts              |    63 +
 packages/core/src/types/dataFreshness.ts           |   196 +
 packages/core/src/types/enhancedAnalysis.js        |   500 +-
 packages/core/src/types/enhancedAnalysis.ts        |   557 +-
 packages/core/src/types/marketData.js              |   182 +-
 packages/core/src/types/marketData.ts              |   186 +-
 packages/core/src/types/prediction.ts              |   157 +
 packages/core/src/types/user.js                    |   276 +-
 packages/core/src/types/user.ts                    |   278 +-
 packages/core/src/types/weeklyBrief.ts             |   114 +
 packages/core/src/types/weeklyBrief.ts.bak.premkt  |    84 +
 packages/core/tsconfig.json                        |    22 +-
 patches/expo-asset+12.0.12.patch                   |   745 +
 patches/expo-constants+18.0.13.patch               |   742 +
 patches/expo-font+14.0.11.patch                    |   748 +
 react-native.config.js                             |    23 +
 scripts/STRIPE-PRODUCTION-CHECK.md                 |    66 +
 scripts/ensure-mobile-node-modules.js              |    59 +
 scripts/gen-deploy-deletion.js                     |    42 +
 scripts/n8n-atlas-morning-brief-prompt.md          |   113 +
 scripts/update-server-stripe-price.ps1             |    28 +
 supabase/.temp/cli-latest                          |     1 +
 supabase/002_onboarding_update.sql                 |   102 +-
 supabase/20260711_sniper_alerts.sql                |    34 +
 supabase/20260712_signal_journal.sql               |    35 +
 supabase/SETUP.md                                  |   302 +-
 supabase/deletion_requests_migration.sql           |    27 +
 .../20250216_revenuecat_subscription_columns.sql   |    33 +
 .../20250322120000_push_notifications.sql          |   225 +
 .../migrations/20250619120000_atlas_run_links.sql  |    13 +
 .../migrations/20250627120000_weekly_brief.sql     |    44 +
 supabase/migrations/20260810120000_daily_brief.sql |    41 +
 .../migrations/20260826010000_ticker_metadata.sql  |    17 +
 .../20260831154500_week_ahead_calendar.sql         |   214 +
 .../20260901204500_earnings_calendar_sources.sql   |    25 +
 ...903223300_backfill_newsletter_from_profiles.sql |    15 +
 supabase/migrations/20260915224500_guest_usage.sql |    27 +
 .../migrations/20260916143000_reels_publish.sql    |    30 +
 supabase/newsletter_migration.sql                  |   189 +
 supabase/newsletter_trigger_test.sql               |    63 +
 supabase/newsletter_webhook_events.sql             |    13 +
 supabase/reels_storage.sql                         |    27 +
 supabase/schema.sql                                |   448 +-
 supabase/subscriptions_migration.sql               |   208 +-
 tsconfig.base.json                                 |    42 +-
 tsconfig.json                                      |     4 +
 turbo.json                                         |    54 +-
 update-remote-env.ps1                              |    32 +
 370 files changed, 66494 insertions(+), 25415 deletions(-)
```

## Files on origin/main that are not in this snapshot

```
TROUBLESHOOTING-PREMIUM-STATUS.md
android/app/src/debugOptimized/AndroidManifest.xml
android/app/src/main/res/drawable-hdpi/splashscreen_logo.png
android/app/src/main/res/drawable-mdpi/splashscreen_logo.png
android/app/src/main/res/drawable-xhdpi/splashscreen_logo.png
android/app/src/main/res/drawable-xxhdpi/splashscreen_logo.png
android/app/src/main/res/drawable-xxxhdpi/splashscreen_logo.png
android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
android/app/src/main/res/mipmap-hdpi/ic_launcher.webp
android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.webp
android/app/src/main/res/mipmap-hdpi/ic_launcher_round.webp
android/app/src/main/res/mipmap-mdpi/ic_launcher.webp
android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.webp
android/app/src/main/res/mipmap-mdpi/ic_launcher_round.webp
android/app/src/main/res/mipmap-xhdpi/ic_launcher.webp
android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.webp
android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.webp
android/app/src/main/res/mipmap-xxhdpi/ic_launcher.webp
android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.webp
android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.webp
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.webp
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp
apps/mobile/android/.gitignore
apps/mobile/android/app/build.gradle
apps/mobile/android/app/debug.keystore
apps/mobile/android/app/proguard-rules.pro
apps/mobile/android/app/src/debug/AndroidManifest.xml
apps/mobile/android/app/src/debugOptimized/AndroidManifest.xml
apps/mobile/android/app/src/main/AndroidManifest.xml
apps/mobile/android/app/src/main/java/com/optionsplungellc/chartsignl/MainActivity.kt
apps/mobile/android/app/src/main/java/com/optionsplungellc/chartsignl/MainApplication.kt
apps/mobile/android/app/src/main/res/drawable-hdpi/splashscreen_logo.png
apps/mobile/android/app/src/main/res/drawable-mdpi/splashscreen_logo.png
apps/mobile/android/app/src/main/res/drawable-xhdpi/splashscreen_logo.png
apps/mobile/android/app/src/main/res/drawable-xxhdpi/splashscreen_logo.png
apps/mobile/android/app/src/main/res/drawable-xxxhdpi/splashscreen_logo.png
apps/mobile/android/app/src/main/res/drawable/ic_launcher_background.xml
apps/mobile/android/app/src/main/res/drawable/rn_edit_text_material.xml
apps/mobile/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
apps/mobile/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
apps/mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher.webp
apps/mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.webp
apps/mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher_round.webp
apps/mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher.webp
apps/mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.webp
apps/mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher_round.webp
apps/mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher.webp
apps/mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.webp
apps/mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.webp
apps/mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.webp
apps/mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.webp
apps/mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.webp
apps/mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp
apps/mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.webp
apps/mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp
apps/mobile/android/app/src/main/res/values-night/colors.xml
apps/mobile/android/app/src/main/res/values/colors.xml
apps/mobile/android/app/src/main/res/values/strings.xml
apps/mobile/android/app/src/main/res/values/styles.xml
apps/mobile/android/build.gradle
apps/mobile/android/gradle.properties
apps/mobile/android/gradle/wrapper/gradle-wrapper.jar
apps/mobile/android/gradle/wrapper/gradle-wrapper.properties
apps/mobile/android/gradlew
apps/mobile/android/gradlew.bat
apps/mobile/android/settings.gradle
apps/mobile/dummy.js
```

## Summary

This branch saves the server working tree that was on sandbox/80eb2710, including changes that were not on GitHub. Compared with origin/main it touches the backend and mobile apps (255 paths), Supabase SQL (23 paths), deploy and nginx config (3 paths), market-alerts and n8n-related files (21 paths), scripts (5 paths), shared packages (25 paths), docs (1 paths), other repo files (37 paths). apps/backend/deploy/.env.bak and apps/mobile/dummy.js were left out because they contain credentials. The running containers were not restarted.
