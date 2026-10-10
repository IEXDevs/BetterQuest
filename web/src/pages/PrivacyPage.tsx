import { useEffect, useState } from 'react';
import AnimatedContent from '../bits/AnimatedContent';
import BlurText from '../bits/BlurText';
import Magnet from '../bits/Magnet';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { PRIVACY_EFFECTIVE_DATE, PRIVACY_NAV } from '../content/privacy';

const NAV_IDS = PRIVACY_NAV.map((item) => item.id);

export function PrivacyPage() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const sections = NAV_IDS
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!(visible?.target instanceof HTMLElement)) return;
      const index = NAV_IDS.indexOf(visible.target.id as (typeof NAV_IDS)[number]);
      if (index >= 0) setActiveIndex(index);
    }, { rootMargin: '-12% 0px -50% 0px', threshold: [0, 0.1, 0.25] });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader current="privacy" />
      <main className="policy" id="main">
        <header className="policy-hero">
          <div>
            <p className="eyebrow">Privacy policy / {PRIVACY_EFFECTIVE_DATE}</p>
            <BlurText
              tag="h1"
              text="Your work stays yours."
              className="policy-blur-title"
              animateBy="words"
              direction="top"
              delay={70}
              stepDuration={0.3}
            />
            <p className="policy-intro">
              BetterQuest is a small layer inside Quest, so its data boundary should be small too. Here is what the
              extension remembers, what can leave your device, and how to erase it.
            </p>
          </div>
          <div className="policy-summary">
            <span>In plain English</span>
            <dl>
              <div><dt>Stored locally</dt><dd>Preferences, observed assignment metadata, bookmarks, and notes.</dd></div>
              <div><dt>Never collected</dt><dd>Passwords, submitted answers, response text, or solution text.</dd></div>
              <div><dt>Sent only in limited cases</dt><dd>Sanitized diagnostics and de-identified product measurements.</dd></div>
            </dl>
          </div>
        </header>

        <div className="policy-layout">
          <aside className="policy-nav" aria-label="On this page">
            <p className="policy-nav-label">On this page</p>
            <nav className="policy-switcher" aria-label="Privacy sections switcher">
              {PRIVACY_NAV.map((item, index) => {
                const isActive = index === activeIndex;
                const paddedIndex = String(index + 1).padStart(2, '0');
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`policy-switcher-btn ${isActive ? 'is-active' : ''}`}
                    onClick={() => {
                      setActiveIndex(index);
                      document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    <span className="policy-switcher-num">{paddedIndex}</span>
                    <span className="policy-switcher-text">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <article className="policy-copy">
            <section className="policy-lede">
              <p>
                BetterQuest is an independent IEXDevs student project. Coursework the extension remembers stays in your
                Chrome profile. Limited de-identified diagnostics may leave the device for issue reporting; future
                EasyAccess support is described separately below.
              </p>
            </section>

            <AnimatedContent distance={28} duration={0.65} threshold={0.08}>
              <section id="extension-data">
                <span className="section-index">01 / On your device</span>
                <h2>What the extension remembers.</h2>
                <p>
                  BetterQuest uses the single Chrome <strong>storage</strong> permission. Its local state is stored under{' '}
                  <code>betterquest.local.v1</code> and may include:
                </p>
                <ul>
                  <li>theme and feature preferences;</li>
                  <li>course and assignment metadata visible on Quest, including titles, source identifiers, URLs, deadlines, and completion labels;</li>
                  <li>a record of which course pages were observed and when they were last observed;</li>
                  <li>question identifiers, question numbers, source links, bookmark status, and bookmark notes; and</li>
                  <li>locally cached study records created by enabled features.</li>
                </ul>
                <p>
                  This information remains in Chrome storage on your device. BetterQuest does not currently operate an
                  account library or upload this coursework state. The diagnostics described below are a separate, limited
                  data flow.
                </p>
              </section>
            </AnimatedContent>

            <AnimatedContent distance={28} duration={0.65} threshold={0.08}>
              <section id="quest-access">
                <span className="section-index">02 / Page access</span>
                <h2>What BetterQuest can see on Quest.</h2>
                <p>
                  The content script runs only on <code>quest.cns.utexas.edu/student</code> pages. It reads course and
                  assignment metadata, deadlines, status, and question identifiers already visible on the page so enabled
                  overview and bookmark features can work.
                </p>
                <div className="boundary-grid">
                  <div><strong>It does</strong><p>Enhance pages you visit and cache the limited metadata listed above.</p></div>
                  <div>
                    <strong>It does not</strong>
                    <p>
                      Read or store passwords, UT login credentials, submitted answers, response text, or solution text.
                      It does not submit work, change grades, or automate assessments.
                    </p>
                  </div>
                </div>
                <p>
                  BetterQuest does not scan every course automatically. An assignment appears in the overview only after
                  the relevant Quest page has been visited and observed.
                </p>
              </section>
            </AnimatedContent>

            <AnimatedContent distance={28} duration={0.65} threshold={0.08}>
              <section id="website">
                <span className="section-index">03 / The network</span>
                <h2>Requests needed to run the site.</h2>
                <p>
                  The extension includes its feature code and does not use an advertising tracker. Quest continues to make
                  the requests needed to operate the page you are using. Diagnostic and aggregate measurement features,
                  when enabled, use IEXDevs services only for the limited purposes below.
                </p>
                <p>
                  Visiting this website sends ordinary requests to our hosting provider. Security and operational logs may
                  include your IP address, browser type, requested path, and request time. We use those logs to deliver,
                  protect, and troubleshoot the site.
                </p>
              </section>
            </AnimatedContent>

            <AnimatedContent distance={28} duration={0.65} threshold={0.08}>
              <section id="diagnostics">
                <span className="section-index">04 / When something breaks</span>
                <h2>Useful errors, without the coursework.</h2>
                <p>
                  When diagnostics are enabled, BetterQuest may send a de-identified user-submitted issue report or an
                  automatic extension error report after an unexpected failure. A report may include the error category,
                  affected feature, extension and browser version, page type, time, and sanitized technical context needed
                  to reproduce the problem.
                </p>
                <p>
                  Diagnostic reports do not include passwords, submitted answers, coursework text, solution text, names,
                  account identifiers, or bookmark-note contents. Text you choose to type into a report is handled as
                  support correspondence.
                </p>
              </section>
            </AnimatedContent>

            <AnimatedContent distance={28} duration={0.65} threshold={0.08}>
              <section id="easyaccess">
                <span className="section-index">05 / Not active today</span>
                <h2>EasyAccess is future work.</h2>
                <p>
                  EasyAccess is the shared IEXDevs login and is currently available only in UTMAX. BetterQuest does not
                  currently offer EasyAccess login. If it is added, the interface and this policy will identify which
                  compatible preferences or product data can be stored on IEXDevs servers and shared across IEXDevs
                  services after you choose to use an account.
                </p>
              </section>
            </AnimatedContent>

            <AnimatedContent distance={28} duration={0.65} threshold={0.08}>
              <section id="analytics">
                <span className="section-index">06 / Product measurement</span>
                <h2>Patterns, not student profiles.</h2>
                <p>
                  When enabled, IEXDevs may collect de-identified measurements such as coarse general location,
                  approximate connection quality or internet speed, API request counts and hourly usage, product version,
                  and sanitized error categories.
                </p>
                <p>
                  Cross-product aggregates may describe high-level schedule or degree-completion trends, frequently used
                  or requested courses, and popular majors, minors, or certificates. BetterQuest does not contribute raw
                  answers, coursework text, names, account IDs, or complete student records to these aggregates.
                </p>
                <p>
                  De-identified aggregate results may appear in public reports and restricted internal developer
                  dashboards. These reports are designed so an individual user cannot reasonably be identified.
                </p>
              </section>
            </AnimatedContent>

            <AnimatedContent distance={28} duration={0.65} threshold={0.08}>
              <section id="sharing">
                <span className="section-index">07 / Other companies</span>
                <h2>No sale. No ad audience.</h2>
                <p>
                  We do not sell, rent, or use your information for advertising. Our website host and diagnostic delivery
                  infrastructure may process ordinary requests and the limited de-identified reports described above.
                </p>
                <p>
                  If you open the IEXDevs contact form, you leave BetterQuest. That form collects the name, email, and
                  message you submit, uses Cloudflare Turnstile to prevent abuse, and uses an email provider to deliver
                  the message. We retain contact correspondence only as reasonably necessary to answer it, maintain
                  service records, or address abuse.
                </p>
              </section>
            </AnimatedContent>

            <AnimatedContent distance={28} duration={0.65} threshold={0.08}>
              <section id="choices">
                <span className="section-index">08 / Your controls</span>
                <h2>Disable it or erase it.</h2>
                <p>
                  You can disable assignment or bookmark features from BetterQuest settings. You can delete local data by
                  removing the extension and clearing its extension data in Chrome. Clearing ordinary Quest website data
                  alone may not remove Chrome extension storage.
                </p>
                <p>
                  BetterQuest is intended for college students and is not directed to children under 13. We may update this
                  policy when the product or its data practices change; the effective date at the top will change with it.
                </p>
              </section>
            </AnimatedContent>

            <AnimatedContent distance={28} duration={0.65} threshold={0.08}>
              <section className="contact-panel" id="contact">
                <span className="section-index">09 / A person, not a ticket maze</span>
                <h2>Ask the team directly.</h2>
                <p>Use the IEXDevs contact form for a privacy question, correction request, or concern about BetterQuest.</p>
                <Magnet padding={40} magnetStrength={2.6} wrapperClassName="magnet-wrap">
                  <a className="button button-light" href="https://iexdevs.com/contact">
                    Contact IEXDevs <span aria-hidden="true">↗</span>
                  </a>
                </Magnet>
              </section>
            </AnimatedContent>

            <section className="independence-note">
              <h2>Independent project</h2>
              <p>
                BetterQuest is not affiliated with, endorsed by, or officially connected to The University of Texas at
                Austin. Quest and related marks belong to their respective owners.
              </p>
            </section>
          </article>
        </div>
      </main>
      <SiteFooter note="Local-first tools for a clearer study workflow." />
    </>
  );
}
