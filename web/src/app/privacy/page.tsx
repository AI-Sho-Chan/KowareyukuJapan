export default function PrivacyPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>
      
      <div className="prose prose-lg max-w-none space-y-6">
        <section>
          <p className="text-gray-600 mb-4">最終更新日: 2024年12月26日</p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. 個人情報の取り扱いについて</h2>
          <p>
            KowareyukuJapan（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。
            本プライバシーポリシーは、本サービスにおける個人情報の取り扱いについて説明します。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">2. 収集する情報</h2>
          <h3 className="text-xl font-semibold mt-4 mb-2">2.1 自動的に収集される情報</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>IPアドレス（セキュリティ目的のみ）</li>
            <li>ブラウザの種類とバージョン</li>
            <li>アクセス日時</li>
            <li>参照元URL</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-4 mb-2">2.2 ユーザーが提供する情報</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>投稿内容（タイトル、コメント、URL）</li>
            <li>ハンドル名（任意）</li>
            <li>アップロードされたメディアファイル</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">3. 情報の利用目的</h2>
          <p>収集した情報は以下の目的で利用します：</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>サービスの提供と改善</li>
            <li>不正利用の防止とセキュリティの維持</li>
            <li>利用統計の作成（匿名化されたデータ）</li>
            <li>法的要請への対応</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Cookieの使用</h2>
          <p>本サービスでは以下の目的でCookieを使用します：</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>投稿者の識別（ローカルストレージ）</li>
            <li>一時的なセッション管理</li>
            <li>アクセス解析（Google Analytics）※今後導入予定</li>
          </ul>
          <p className="mt-2">
            ブラウザの設定によりCookieを無効化できますが、一部機能が制限される場合があります。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">5. 情報の共有と開示</h2>
          <p>以下の場合を除き、個人情報を第三者と共有することはありません：</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく開示請求があった場合</li>
            <li>生命、身体または財産の保護のために必要な場合</li>
            <li>サービス運営に必要な委託先への提供（守秘義務契約締結済み）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">6. データの保存期間</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>投稿コンテンツ：削除要請があるまで保存</li>
            <li>IPアドレス：最大30日間</li>
            <li>アクセスログ：最大90日間</li>
            <li>削除済みコンテンツ：削除後30日間（復元可能期間）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">7. セキュリティ対策</h2>
          <p>以下のセキュリティ対策を実施しています：</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>HTTPS通信による暗号化</li>
            <li>定期的なセキュリティアップデート</li>
            <li>アクセス制限と監視</li>
            <li>定期的なバックアップ</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">8. 未成年者の利用について</h2>
          <p>
            13歳未満の方は保護者の同意を得てご利用ください。
            未成年者の個人情報については、特に慎重に取り扱います。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">9. 外部サービスとの連携</h2>
          <p>本サービスは以下の外部サービスと連携しています：</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>YouTube（動画埋め込み）</li>
            <li>X/Twitter（投稿埋め込み）</li>
            <li>Instagram（投稿埋め込み）</li>
            <li>その他SNSプラットフォーム</li>
          </ul>
          <p className="mt-2">
            これらのサービスには各社のプライバシーポリシーが適用されます。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">10. お問い合わせ</h2>
          <p>
            個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください：
          </p>
          <p className="mt-2">
            [管理者へのお問い合わせフォームを後日設置予定]
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">11. ポリシーの変更</h2>
          <p>
            本プライバシーポリシーは、法令の変更やサービスの変更に応じて、予告なく変更される場合があります。
            重要な変更についてはサイト上で通知します。
          </p>
        </section>

        <section className="mt-12 pt-8 border-t">
          <div className="bg-blue-50 p-4 rounded">
            <p className="font-semibold mb-2">特定電気通信役務提供者としての表示</p>
            <p className="text-sm">
              本サービスは特定電気通信役務提供者として、プロバイダ責任制限法に基づく対応を行います。
              権利侵害の申し立てについては、所定の手続きに従って対応いたします。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}