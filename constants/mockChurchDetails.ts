export interface MockSocialMedia {
  handle: string;
  followers: number;
}

export interface MockReview {
  author: string;
  instrument: string;
  text: string;
}

export interface MockChurchExtras {
  denomination: string;
  worship_style: string;
  congregation_size: string;
  social: {
    instagram?: MockSocialMedia;
    facebook?: MockSocialMedia;
  };
  reviews: {
    musicianship: number;
    reliability: number;
    communication: number;
    comments: MockReview[];
  };
}

export const MOCK_CHURCH_DETAILS: Record<string, MockChurchExtras> = {
  'mock-church-1': {
    denomination: 'Non-Denominational',
    worship_style: 'Contemporary',
    congregation_size: 'Large (1,200+)',
    social: {
      instagram: { handle: '@gracehouston', followers: 4200 },
      facebook: { handle: 'Grace Community Church', followers: 8900 },
    },
    reviews: {
      musicianship: 88,
      reliability: 91,
      communication: 85,
      comments: [
        { author: 'Marcus T.', instrument: 'Guitar', text: 'Super organized team, great sound system. Very professional and easy to work with.' },
        { author: 'Aliyah R.', instrument: 'Vocals', text: 'Warm, welcoming staff. Rehearsal was smooth and they knew exactly what they wanted.' },
      ],
    },
  },
  'mock-church-2': {
    denomination: 'Pentecostal',
    worship_style: 'Contemporary',
    congregation_size: 'Medium (500–900)',
    social: {
      instagram: { handle: '@newlifehtown', followers: 2100 },
      facebook: { handle: 'New Life Fellowship Houston', followers: 5400 },
    },
    reviews: {
      musicianship: 90,
      reliability: 87,
      communication: 82,
      comments: [
        { author: 'David K.', instrument: 'Keys', text: 'Great energy and passion in their worship. They value musical excellence.' },
        { author: 'Jordan P.', instrument: 'Drums', text: 'Showed up to rehearsal with charts ready. Much appreciated!' },
      ],
    },
  },
  'mock-church-3': {
    denomination: 'Southern Baptist',
    worship_style: 'Blended',
    congregation_size: 'Medium (400–700)',
    social: {
      instagram: { handle: '@cornerstonebaptist', followers: 850 },
      facebook: { handle: 'Cornerstone Baptist Church', followers: 3200 },
    },
    reviews: {
      musicianship: 78,
      reliability: 95,
      communication: 90,
      comments: [
        { author: 'Lisa M.', instrument: 'Vocals', text: 'Very traditional and structured. Great communication throughout the whole process.' },
        { author: 'Robert H.', instrument: 'Keys', text: 'Reliable payments and always on time. Really appreciated the organized choir director.' },
      ],
    },
  },
  'mock-church-4': {
    denomination: 'Non-Denominational',
    worship_style: 'Contemporary',
    congregation_size: 'Large (2,000+ multi-campus)',
    social: {
      instagram: { handle: '@harvestpointchurch', followers: 6800 },
      facebook: { handle: 'Harvest Point Church', followers: 14500 },
    },
    reviews: {
      musicianship: 94,
      reliability: 88,
      communication: 91,
      comments: [
        { author: 'Tasha W.', instrument: 'Bass', text: 'Multi-campus setup is impressive. Their production team is top-notch.' },
        { author: 'Chris B.', instrument: 'Audio Tech', text: 'Great gear, well-maintained stage. The worship director is very technically minded.' },
      ],
    },
  },
  'mock-church-5': {
    denomination: 'African Methodist Episcopal',
    worship_style: 'Gospel',
    congregation_size: 'Medium (500–800)',
    social: {
      instagram: { handle: '@faithtabernaclehtx', followers: 1600 },
      facebook: { handle: 'Faith Tabernacle AME', followers: 4100 },
    },
    reviews: {
      musicianship: 96,
      reliability: 83,
      communication: 79,
      comments: [
        { author: 'Denise F.', instrument: 'Vocals', text: 'Incredible spirit in that place. If you love gospel, this is the church to play for.' },
        { author: 'Kevin A.', instrument: 'Guitar', text: 'Spontaneous worship moments — you have to stay on your toes. Rewarding experience.' },
      ],
    },
  },
  'mock-church-6': {
    denomination: 'Non-Denominational',
    worship_style: 'Contemporary',
    congregation_size: 'Mega (5,000+)',
    social: {
      instagram: { handle: '@elevationcity', followers: 22000 },
      facebook: { handle: 'Elevation City Church', followers: 41000 },
    },
    reviews: {
      musicianship: 97,
      reliability: 92,
      communication: 95,
      comments: [
        { author: 'Nate B.', instrument: 'Guitar', text: "World-class production. You'll feel like you're playing at an arena concert. 10/10." },
        { author: 'Priya S.', instrument: 'Keys', text: 'Best gig I\'ve ever played. The production team was exceptional and pay was prompt.' },
      ],
    },
  },
  'mock-church-7': {
    denomination: 'Non-Denominational',
    worship_style: 'Contemporary / Arts',
    congregation_size: 'Small (under 200)',
    social: {
      instagram: { handle: '@thegatheringplace', followers: 1100 },
      facebook: { handle: 'The Gathering Place Houston', followers: 2300 },
    },
    reviews: {
      musicianship: 85,
      reliability: 89,
      communication: 88,
      comments: [
        { author: 'Sophie L.', instrument: 'Violin', text: 'Creative, arts-focused congregation. They welcomed my classical background with open arms.' },
        { author: 'Andre M.', instrument: 'Guitar', text: 'Small but mighty. The intimacy of the space makes for an incredibly moving worship experience.' },
      ],
    },
  },
};
