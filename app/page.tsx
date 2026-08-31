import PromptForm from "@/components/PromptForm";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-xl">
        <p className="font-mono text-xs tracking-widest uppercase text-[var(--route)] mb-4">
          AI Insider
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-medium leading-tight mb-4">
          YouTube has the course.
          <br />
          You just couldn&apos;t find it.
        </h1>
        <p className="text-[var(--text-dim)] mb-10 max-w-lg">
          Tell us what you want to learn. We&apos;ll chart a route through the best videos
          already out there — in order, tracked, done.
        </p>
        <PromptForm />
      </div>
    </main>
  );
}
