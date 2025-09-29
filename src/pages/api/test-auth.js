import { withAuth } from '../../middleware/auth'

async function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Auth working!',
    user: req.user?.email,
    company: req.company?.name
  })
}

export default withAuth(handler)
