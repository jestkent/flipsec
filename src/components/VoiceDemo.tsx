import ReadAloudButton from "./ReadAloudButton";

// The lesson the people this app is written for need most, and the one it can
// demonstrate without building anything dangerous.
//
// This does NOT clone anybody. The voice below is the same generic AI voice
// the app already uses for Read aloud, saying a line a scammer would say. A
// reader cannot upload a sample, and nothing here takes a voice from anyone.
// That is deliberate: a working voice cloner is attack tooling, and shipping
// one on an app that teaches people to recognise impersonation would be
// indefensible. The point lands anyway, because the point is not "we can
// clone your daughter" — it is "a voice is no longer proof of who is calling".
//
// Every fact stated below has to stay true. If the numbers drift, change them
// here rather than leaving a confident claim nobody checked.

export default function VoiceDemo() {
  const line =
    "Hi, it's me. I'm in trouble and I really need your help. Please don't tell anyone, just send the money and I'll explain later.";

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <p className="text-sm font-semibold tracking-widest text-slate uppercase">
          Try it yourself
        </p>
        <p className="mt-1.5 text-base leading-relaxed text-ink">
          This is what the call sounds like now. Press play.
        </p>
      </div>

      <div className="rounded-card border border-line bg-ivory p-5">
        <p className="text-sm font-semibold tracking-wider text-slate uppercase">
          Incoming call
        </p>
        <p className="mt-2 text-base leading-relaxed text-ink">
          &ldquo;{line}&rdquo;
        </p>
        <div className="mt-3">
          <ReadAloudButton text={line} label="Play the call" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-wider text-slate uppercase">
          What you just heard
        </p>
        <p className="text-base leading-relaxed text-ink">
          A computer made that, in about the time it took to load. Nobody
          recorded it and nobody acted it. It is the same voice this site uses
          to read cards aloud, which is why it is labelled as AI-generated
          while it plays.
        </p>
        <p className="text-base leading-relaxed text-ink">
          A scammer does one more thing we are not doing here: they copy a
          real person&rsquo;s voice first. That takes a short clip of someone
          talking, which is easy to get from a video anyone has posted. Then
          the voice on your phone is not a stranger reading a script. It is
          your son, your daughter, your grandchild.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-card bg-ivory p-4">
        <p className="text-sm font-semibold tracking-wider text-slate uppercase">
          What actually works
        </p>
        <ul className="flex flex-col gap-2 text-base leading-relaxed text-ink">
          <li className="flex gap-3">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage" />
            <span>
              <strong className="font-semibold text-navy">Hang up and call back</strong>{" "}
              on the number you already have for them. Not a number they gave
              you on the call.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage" />
            <span>
              <strong className="font-semibold text-navy">Agree a family word</strong>{" "}
              now, while nothing is wrong. Something no stranger would know and
              nobody has posted.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage" />
            <span>
              <strong className="font-semibold text-navy">Slow down on purpose.</strong>{" "}
              &ldquo;Don&rsquo;t tell anyone&rdquo; and &ldquo;right now&rdquo;
              are the scam, not the emergency. A real emergency survives you
              checking.
            </span>
          </li>
        </ul>
      </div>

      <p className="text-base leading-relaxed text-ink">
        Recognising the voice used to be enough. It is not any more, and that
        is not a failure of attention. It is a tell that stopped working.
      </p>
    </div>
  );
}
