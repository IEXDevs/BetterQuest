import AnimatedContent from '../bits/AnimatedContent';
import BlurText from '../bits/BlurText';
import { InstallExtensionButton } from '../components/InstallExtensionButton';
import { InteractiveProductFrame } from '../components/InteractiveProductFrame';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';

export function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader current="product" />
      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <BlurText
              tag="h1"
              text="All your Quest work. One View."
              className="hero-blur-title"
              animateBy="words"
              direction="top"
              delay={80}
              stepDuration={0.28}
              style={{ justifyContent: 'center', textAlign: 'center', width: '100%' }}
            />
            <p className="hero-lede">
              A streak-style tracker for everything on Quest: every assignment you open, every due date that matters,
              and a Google Calendar link that refreshes daily. It never submits an answer or changes a grade.
            </p>
            <div className="hero-actions">
              <InstallExtensionButton />
              <a className="button button-quiet" href="/privacy">Privacy Policy</a>
            </div>
          </div>

          <div className="hero-product-stage">
            <InteractiveProductFrame />
          </div>
        </section>

        <AnimatedContent distance={36} duration={0.7} threshold={0.12} className="statement">
          <p className="eyebrow">Why it exists</p>
          <h2>We organize your work and improve the UI with adjustments for maximum ease of use.</h2>
          <p>Consolidating deadlines, streamlining course navigation, and refining the interface so studying feels effortless.</p>
        </AnimatedContent>

        <section className="feature-story" id="inside">
          <AnimatedContent distance={40} duration={0.75} className="feature-article">
            <article>
              <div className="feature-copy"><span className="feature-index">01 / Tracker</span><h2>Keep a streak across every course.</h2><p>BetterQuest tracks the assignments you visit into one overview: what is due, what is still open, and how the week is stacking up. It is a personal streak board for Quest work, not a crawl of your entire account.</p></div>
              <div className="feature-visual streak-visual" aria-hidden="true">
                <div className="streak-visual__head">
                  <small>Current streak</small>
                  <strong>12 days</strong>
                </div>
                <div className="streak-visual__week">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                    <span key={`${day}-${index}`} className={index < 5 ? 'is-lit' : undefined}>{day}</span>
                  ))}
                </div>
                <ul>
                  <li><b>Today</b><span>3 due · 1 done</span></li>
                  <li><b>This week</b><span>11 tracked</span></li>
                  <li><b>Open loop</b><span>Physics HW 4</span></li>
                </ul>
              </div>
            </article>
          </AnimatedContent>
          <AnimatedContent distance={40} duration={0.75} delay={0.05} className="feature-article">
            <article>
              <div className="feature-copy"><span className="feature-index">02 / Calendar</span><h2>Drop every due date into Google Calendar.</h2><p>One subscribe link adds every tracked task and deadline to Google Calendar. The feed refreshes every day, so new and moved due dates show up without re-exporting a file.</p></div>
              <div className="feature-visual calendar-visual" aria-hidden="true">
                <small>Google Calendar · live feed</small>
                <strong>betterquest.ics</strong>
                <p>Subscribe once. Tasks and due dates update daily from the work you have tracked.</p>
                <div className="calendar-visual__events">
                  <div><em>FRI 10:00 PM</em><b>Sequences &amp; series</b><span>M 408D</span></div>
                  <div><em>MON 11:59 PM</em><b>Thermochemistry</b><span>CH 301</span></div>
                  <div><em>TUE 9:00 PM</em><b>Rotational dynamics</b><span>PHY 303K</span></div>
                </div>
                <span>Updated every day</span>
              </div>
            </article>
          </AnimatedContent>
          <AnimatedContent distance={40} duration={0.75} delay={0.08} className="feature-article">
            <article>
              <div className="feature-copy"><span className="feature-index">03 / Bookmarks</span><h2>Save the question, not a screenshot of it.</h2><p>Bookmark a question with its assignment link and a private note. BetterQuest remembers the route back; it does not copy your answer or the solution.</p></div>
              <div className="feature-visual note-visual" aria-hidden="true"><small>M 408D · Homework 5</small><strong>Question 7</strong><p>Review the ratio test before office hours.</p><span>Saved locally</span></div>
            </article>
          </AnimatedContent>
        </section>

        <section className="closing">
          <h2>Getting You To The Finish Line.<br />Better In Every Way Possible</h2>
          <div className="closing-actions">
            <InstallExtensionButton label="Get the extn" />
            <a className="button button-light" href="https://iexdevs.com/contact">Talk to the team <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
