import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import { UserModel } from '../models/user.model';

const router = Router();

router.get('/', authenticateUser, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).populate('workspaces.workspaceId').exec();
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    return res.status(200).json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
