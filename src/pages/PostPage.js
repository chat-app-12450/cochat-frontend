import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchWithAuth } from "../utils/api";

const PostPage = () => {
    const { postId } = useParams();
    const [post, setPost] = useState(null);

    useEffect(() => {
        const fetchPost = async () => {
            const response = await fetchWithAuth(`/api/posts/${postId}`);
            if (response.success) {
                setPost(response.response);
            }
        };
        fetchPost();
    }, [postId]);

    if (!post) return <p>Loading...</p>;

    return (
        <div>
            <h2>{post.title}</h2>
            <p>{post.content}</p>
            <p>By: {post.user.name}</p>
        </div>
    );
};

export default PostPage;
