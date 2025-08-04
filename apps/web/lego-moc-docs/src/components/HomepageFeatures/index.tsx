import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Create Instructions',
    icon: '📝',
    description: (
      <>
        Build step-by-step instructions for your LEGO creations with our intuitive 
        instruction builder. Support for text, photos, and video instructions.
      </>
    ),
  },
  {
    title: 'Share Your Work',
    icon: '🌐',
    description: (
      <>
        Upload and share your MOCs with the global LEGO community. Get feedback, 
        likes, and build your reputation as a creator.
      </>
    ),
  },
  {
    title: 'Discover Builds',
    icon: '🔍',
    description: (
      <>
        Browse thousands of custom LEGO builds from other creators. Use advanced 
        search and filtering to find exactly what you're looking for.
      </>
    ),
  },
  {
    title: 'Wishlist Management',
    icon: '📋',
    description: (
      <>
        Keep track of LEGO sets and parts you want. Organize by priority and 
        get notifications when items become available.
      </>
    ),
  },
  {
    title: 'Gallery Showcase',
    icon: '🖼️',
    description: (
      <>
        Showcase your completed builds with high-quality photos. Add descriptions, 
        tags, and connect with other builders.
      </>
    ),
  },
  {
    title: 'Community Features',
    icon: '👥',
    description: (
      <>
        Follow other builders, join discussions, and participate in building 
        challenges. Build connections in the LEGO community.
      </>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <div className={styles.featureIcon} style={{fontSize: '3rem', marginBottom: '1rem'}}>
          {icon}
        </div>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
