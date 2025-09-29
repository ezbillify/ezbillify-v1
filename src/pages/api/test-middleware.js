import { withAuth } from '../../middleware/auth'

const handler = async (req, res) => {
  console.log('TEST MIDDLEWARE - Handler called');
  return res.status(200).json({ 
    success: true, 
    message: 'Test middleware working',
    user: req.user?.email,
    userProfile: !!req.userProfile,
    company: req.company?.name
  });
}

export default withAuth(handler)
