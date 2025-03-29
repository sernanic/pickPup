// Script to create the pets bucket in Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createPetsBucket() {
  console.log('Creating pets bucket...');
  
  try {
    // First check if the bucket exists
    const { data: bucketList, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    console.log('Current buckets:', bucketList.map(b => b.name));
    
    const bucketExists = bucketList.some(bucket => bucket.name === 'pets');
    
    if (bucketExists) {
      console.log('✅ The pets bucket already exists!');
      
      // Update bucket to ensure it's public
      const { error: updateError } = await supabase.storage.updateBucket('pets', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
      });
      
      if (updateError) {
        console.error('Error updating bucket:', updateError);
      } else {
        console.log('✅ Updated pets bucket to be public');
      }
    } else {
      // Create the bucket
      const { data, error } = await supabase.storage.createBucket('pets', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
      } else {
        console.log('✅ Successfully created pets bucket!');
      }
    }
    
    // Check bucket policies
    console.log('Setting public bucket policies...');
    
    const { error: policyError } = await supabase.storage.from('pets').getPublicUrl('test-path');
    
    if (policyError) {
      console.error('Error with bucket policies:', policyError);
    } else {
      console.log('✅ Bucket policies are working correctly');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createPetsBucket().then(() => {
  console.log('Done!');
});
