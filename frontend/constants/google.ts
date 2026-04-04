// ======================================================
// Google OAuth Client IDs の設定
// ======================================================
// 手順:
//   1. https://console.cloud.google.com/ でプロジェクトを作成
//   2. 「APIとサービス」→「認証情報」→「OAuth 2.0 クライアントID」を作成
//   3. 以下の3種類を作成:
//      - Web アプリケーション (Expo開発用)
//      - iOS (本番用)
//      - Android (本番用)
//   4. 各Client IDを下記に貼り付ける
//
// Expo Goでのテスト:
//   - expoClientId (Web Client ID) のみ設定すれば動作します
// ======================================================

export const GOOGLE_CLIENT_IDS = {
  // Web Client ID (Expo Goでの開発・テスト用)
  clientId: "YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com",

  // iOS用 (本番ビルド時)
  iosClientId: "YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com",

  // Android用 (本番ビルド時)
  androidClientId: "YOUR_GOOGLE_ANDROID_CLIENT_ID.apps.googleusercontent.com",
};
