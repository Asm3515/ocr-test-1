import VoiceQuery from "@/components/VoiceQuery";

export default function VoicePage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Voice Vector Search</h1>
      <p className="text-sm opacity-80 mb-4">
        Tap the mic, say something like: <em>“invoice below 7000”</em> or <em>“electronics under $100 in 2013”</em>.
      </p>
      <VoiceQuery k={5} />
    </main>
  );
}
