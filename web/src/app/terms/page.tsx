export default function TermsPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">利用規約</h1>
      
      <div className="prose prose-lg max-w-none space-y-6">
        <section>
          <p className="text-gray-600 mb-4">最終更新日: 2024年12月26日</p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. サービスの概要</h2>
          <p>
            KowareyukuJapan（以下「本サービス」）は、日本に関する情報を収集・共有するためのプラットフォームです。
            本サービスをご利用いただく前に、以下の利用規約をよくお読みください。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">2. 利用条件</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>本サービスは無料でご利用いただけます</li>
            <li>日本国内外を問わず、どなたでもご利用いただけます</li>
            <li>投稿内容は日本語での記述を推奨します</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">3. 禁止事項</h2>
          <p>以下の行為を禁止します：</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>虚偽の情報や誤解を招く情報の投稿</li>
            <li>他者の著作権、プライバシー、その他の権利を侵害する行為</li>
            <li>違法なコンテンツの投稿</li>
            <li>スパム行為や自動化された大量投稿</li>
            <li>サービスの運営を妨害する行為</li>
            <li>ヘイトスピーチや差別的な表現</li>
            <li>営利目的の宣伝や勧誘（事前承認なく）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">4. 投稿コンテンツについて</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>投稿されたコンテンツの著作権は投稿者に帰属します</li>
            <li>投稿により、本サービスでの表示・配信に必要な範囲でのライセンスを付与いただきます</li>
            <li>不適切なコンテンツは予告なく削除する場合があります</li>
            <li>3回以上通報されたコンテンツは自動的に非公開となります</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">5. 免責事項</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>本サービスは現状有姿で提供され、いかなる保証も行いません</li>
            <li>投稿内容の正確性、信頼性について責任を負いません</li>
            <li>本サービスの利用により生じた損害について責任を負いません</li>
            <li>サービスの中断、終了について事前通知なく行う場合があります</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">6. 著作権侵害の申し立て</h2>
          <p>
            著作権侵害の疑いがあるコンテンツを発見した場合は、以下の情報を添えてご連絡ください：
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>権利者の氏名と連絡先</li>
            <li>侵害されている著作物の説明</li>
            <li>侵害コンテンツのURL</li>
            <li>著作権を有することの証明</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">7. 準拠法と管轄</h2>
          <p>
            本規約は日本法に準拠し、本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">8. 規約の変更</h2>
          <p>
            本規約は予告なく変更される場合があります。重要な変更についてはサイト上で通知します。
            変更後も継続してサービスを利用された場合、変更後の規約に同意したものとみなします。
          </p>
        </section>

        <section className="mt-12 pt-8 border-t">
          <p className="text-gray-600">
            お問い合わせ：[管理者へのお問い合わせフォームを後日設置予定]
          </p>
        </section>
      </div>
    </main>
  );
}