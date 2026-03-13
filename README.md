<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a0e1a7f7-edd1-48ec-bf6f-54af09c6fa57

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create a `.env` file based on `.env.example` and complete the values.
3. For Google Maps, use separate keys:
   - `VITE_GOOGLE_MAPS_API_KEY`: browser key (only for Places JS, with HTTP referrer restrictions)
   - `GOOGLE_MAPS_API_KEY`: server key (used by `/api/maps` for Geocoding and Routes)
4. Run the app:
   `npm run dev`
