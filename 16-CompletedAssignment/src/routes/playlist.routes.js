import {Router} from "express";
import {getPlaylistById,getUserPlaylists,addVideoToPlaylist,removeVideoFromPlaylist,createPlaylist,deletePlaylist,updatePlaylist} from "../controllers/playlist.controllers.js";
import {verifyJWT} from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(verifyJWT);

router
.route("/")
.post(createPlaylist);

router
.route("/:playlistId")
.get(getPlaylistById)
.patch(updatePlaylist)
.delete(deletePlaylist);

router
.route("/add/:videoId/:playlistId")
.patch(addVideoToPlaylist)

router
.route("/remove/:videoId/:playlistId")
.patch(removeVideoFromPlaylist);

router
.route("/user/:userId")
.post(getUserPlaylists);

export default router;