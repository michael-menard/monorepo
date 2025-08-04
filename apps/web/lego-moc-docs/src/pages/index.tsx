import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Get Started - 5min ⏱️
          </Link>
          <Link
            className="button button--lego button--lg"
            to="http://localhost:3000"
            style={{marginLeft: '1rem'}}>
            🧱 Launch App
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Welcome to ${siteConfig.title}`}
      description="Build, share, and discover amazing LEGO creations with our comprehensive platform for MOC instructions.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <section className="container margin-vert--xl">
          <div className="row">
            <div className="col col--8 col--offset-2">
              <div className="lego-card">
                <h2>🚀 Quick Start</h2>
                <p>
                  Ready to start building? Follow these simple steps to get started with LEGO MOC Instructions:
                </p>
                <ol>
                  <li><strong>Create an Account</strong> - Sign up for free to start sharing your builds</li>
                  <li><strong>Browse the Gallery</strong> - Explore existing MOCs for inspiration</li>
                  <li><strong>Create Your First MOC</strong> - Use our intuitive instruction builder</li>
                  <li><strong>Share with Community</strong> - Upload your creation and get feedback</li>
                </ol>
                <div style={{textAlign: 'center', marginTop: '2rem'}}>
                  <Link
                    className="button button--lego"
                    to="/docs/tutorials/create-first-moc">
                    Create Your First MOC
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
