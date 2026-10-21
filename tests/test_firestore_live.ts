import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB2TE5A1tB37kObPy2XTHAHFZd5CxAMuMo',
  authDomain: 'hikmah-library-94121.firebaseapp.com',
  projectId: 'hikmah-library-94121',
  storageBucket: 'hikmah-library-94121.firebasestorage.app',
  messagingSenderId: '528730588235',
  appId: '1:528730588235:web:9c649af05d9637fbf639ce',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

async function test() {
  console.log('Testing Firestore connection to project:', firebaseConfig.projectId);
  try {
    const snap = await getDocs(collection(db, 'member_profiles'));
    console.log('Successfully fetched member_profiles! Document count:', snap.size);
    snap.forEach((d) => {
      console.log(' - Member:', d.id, d.data().fullName, d.data().email);
    });
  } catch (err: any) {
    console.error('FAILED fetching member_profiles:', err.code, err.message);
  }

  try {
    const snapDir = await getDocs(collection(db, 'member_directory'));
    console.log('Successfully fetched member_directory! Document count:', snapDir.size);
    snapDir.forEach((d) => {
      console.log(' - Directory:', d.id, d.data().fullName);
    });
  } catch (err: any) {
    console.error('FAILED fetching member_directory:', err.code, err.message);
  }

  try {
    const snapAnn = await getDocs(collection(db, 'announcements'));
    console.log('Successfully fetched announcements! Count:', snapAnn.size);
  } catch (err: any) {
    console.error('FAILED fetching announcements:', err.code, err.message);
  }

  process.exit(0);
}

test();
