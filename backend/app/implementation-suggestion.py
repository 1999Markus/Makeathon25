// ...existing code...
@router.get("/get-key-concepts")
async def get_key_concepts():
    """
    Get the key concepts for the hardcoded course.
    """
    concepts = pd.read_csv("extracted_key_concepts/ArtificialIntelligence_2_IntelligentAgents-2_qa.csv")

    key_concepts = []
    for tuples in concepts.head(10).itertuples():
        key_concepts.append(tuples[0]) # DO NOT CHANGE THIS

    return key_concepts

# --- Endpoints for Real-time Transcription (Async with `websockets`, Multi-User) ---

@router.post("/session/initiate_async_multi")
async def initiate_async_multi_session(concept_id: str = Form(...)):
    session_id = str(uuid.uuid4())
    # TODO: Consider if a lock is needed for concurrent access to active_voice_sessions if many initiations happen at once
    active_voice_sessions[session_id] = {
        "concept_id": concept_id,
        "transcription": "",
        "openai_listener_task": None, # Will hold the asyncio.Task for listening to OpenAI
        # "audio_chunks_debug": [] # Optional: for debugging audio if needed
    }
    print(f"Async session initiated: {session_id} for concept: {concept_id}")
    return {
        "session_id": session_id,
        # Ensure this path matches your router's prefix if any (e.g., /api/v1)
        "audio_stream_endpoint": router.url_path_for("stream_audio_async_multi", session_id=session_id)
    }

async def openai_message_listener(session_id: str, openai_ws: websockets.client.WebSocketClientProtocol):
    """Listens for messages from OpenAI WebSocket and updates session transcription."""
    print(f"[OpenAI Listener - {session_id}] Started.")
    # TODO: Add comprehensive error handling for connection and message processing
    try:
        async for message_str in openai_ws:
            if session_id not in active_voice_sessions:
                print(f"[OpenAI Listener - {session_id}] Session removed. Stopping listener.")
                break # Exit if session was cleaned up
            
            # TODO: Add JSON parsing error handling (try-except json.JSONDecodeError)
            try:
                data = json.loads(message_str)
            except json.JSONDecodeError:
                print(f"[OpenAI Listener - {session_id}] Received non-JSON message: {message_str}")
                continue # Skip non-JSON messages

            # print(f"[OpenAI Listener - {session_id}] Received: {json.dumps(data, indent=2)}") # Verbose
            # IMPORTANT: Adjust based on actual OpenAI real-time transcription message structure
            if "text" in data and data["text"]: # This is an example, check OpenAI's actual response
                # TODO: Consider locking access to transcription if updates are very frequent and complex
                active_voice_sessions[session_id]["transcription"] += data["text"] + " "
                # print(f"[OpenAI Listener - {session_id}] Transcription: ...{active_voice_sessions[session_id]['transcription'][-70:]}")
            elif "error" in data: # Example error handling from OpenAI
                print(f"[OpenAI Listener - {session_id}] Error from OpenAI: {data['error']}")
            # TODO: Handle other message types from OpenAI (e.g., session lifecycle, metadata, final transcription markers)

    except websockets.exceptions.ConnectionClosedError as e:
        print(f"[OpenAI Listener - {session_id}] Connection to OpenAI closed: {e.code} {e.reason}")
    except asyncio.CancelledError:
        print(f"[OpenAI Listener - {session_id}] Task cancelled.")
    # TODO: Add a more general except Exception for unexpected errors within the listener.
    except Exception as e_listener:
        print(f"[OpenAI Listener - {session_id}] Unexpected error: {e_listener}")
        # traceback.print_exc() # For debugging
    finally:
        print(f"[OpenAI Listener - {session_id}] Finished.")
        # TODO: Ensure task reference is robustly cleared from active_voice_sessions if task self-terminates
        # This might involve checking if the task is in active_voice_sessions[session_id]["openai_listener_task"]
        # and if it's done, then setting it to None.


@router.websocket("/session/stream_audio_async/{session_id}")
async def stream_audio_async_multi(websocket: WebSocket, session_id: str):
    await websocket.accept()
    print(f"Client WebSocket accepted for session: {session_id}")

    if session_id not in active_voice_sessions:
        print(f"Session {session_id} not found. Closing client WebSocket.")
        # TODO: Send a proper close message to the client before closing
        await websocket.close(code=1008) # Policy Violation or custom code (e.g., 4000 for session not found)
        return

    session_data = active_voice_sessions[session_id]
    
    # TODO: Robustly handle pre-existing listener tasks (cancel and await with timeout)
    if session_data.get("openai_listener_task") and not session_data["openai_listener_task"].done():
        print(f"Warning: Existing listener task found for session {session_id}. Attempting to cancel.")
        session_data["openai_listener_task"].cancel()
        try:
            await asyncio.wait_for(session_data["openai_listener_task"], timeout=1.0)
        except asyncio.CancelledError:
            print(f"[Client WS - {session_id}] Pre-existing listener task cancelled.")
        except asyncio.TimeoutError:
            print(f"[Client WS - {session_id}] Timeout cancelling pre-existing listener task.")
        except Exception as e_cancel_old:
            print(f"[Client WS - {session_id}] Error cancelling pre-existing listener: {e_cancel_old}")
        session_data["openai_listener_task"] = None


    # TODO: Ensure settings.openai_transcription_url is correctly defined in your config
    openai_ws_url = settings.openai_transcription_url
    openai_headers = {
        "Authorization": "Bearer " + settings.openai_api_key, # Use settings.openai_api_key
        "OpenAI-Beta": "realtime=v1" # Verify if this header is still current/needed for your OpenAI API version
    }
    
    listener_task = None
    openai_ws_connection = None # To hold the connection object for explicit close if needed

    try:
        # TODO: Add specific exception handling for websockets.connect (e.g., InvalidURI, ConnectionRefusedError)
        async with websockets.connect(openai_ws_url, extra_headers=openai_headers) as openai_ws:
            openai_ws_connection = openai_ws
            print(f"[OpenAI WS - {session_id}] Successfully connected to OpenAI.")
            
            listener_task = asyncio.create_task(openai_message_listener(session_id, openai_ws))
            session_data["openai_listener_task"] = listener_task

            try:
                while True:
                    # TODO: Check if listener_task is done; if so, OpenAI connection might be dead.
                    # If listener_task.done(), you might want to break and close the client connection.
                    # Consider listener_task.exception() to see if it errored.
                    if listener_task.done():
                        print(f"[Client WS - {session_id}] OpenAI listener task finished unexpectedly. Closing client connection.")
                        if listener_task.exception():
                             print(f"[Client WS - {session_id}] OpenAI listener exception: {listener_task.exception()}")
                        break

                    data = await websocket.receive_bytes()
                    # TODO: Check if openai_ws is still open before sending (openai_ws.open)
                    if openai_ws.open:
                        await openai_ws.send(data)
                    else:
                        print(f"[Client WS - {session_id}] OpenAI WebSocket is not open. Cannot send data.")
                        break
            
            except WebSocketDisconnect:
                print(f"[Client WS - {session_id}] Client disconnected.")
            except websockets.exceptions.ConnectionClosedError as e_openai_closed:
                # This might happen if OpenAI closes the connection while we are trying to send
                print(f"[OpenAI WS - {session_id}] Connection to OpenAI closed during send/receive: {e_openai_closed}")
            # TODO: Add a general except Exception for other errors in the audio forwarding loop.
            except Exception as e_loop:
                print(f"[Client WS - {session_id}] Error in audio streaming loop: {e_loop}")
                # traceback.print_exc()

        # This block is reached if openai_ws closes gracefully (e.g., OpenAI closes it, or 'async with' exits)
        print(f"[OpenAI WS - {session_id}] Exited 'async with websockets.connect' block.")

    # TODO: Add broader try-except around the main WebSocket handling logic for unexpected errors
    # e.g., if websockets.connect itself fails before entering the 'async with' block.
    except websockets.exceptions.InvalidURI:
        print(f"[OpenAI WS - {session_id}] Error: Invalid OpenAI WebSocket URI: {openai_ws_url}")
        # TODO: Close client websocket gracefully
    except websockets.exceptions.WebSocketException as e_ws_connect: # Catches various connection errors
        print(f"[OpenAI WS - {session_id}] Error connecting to OpenAI WebSocket: {e_ws_connect}")
        # TODO: Close client websocket gracefully
    except Exception as e_outer:
        print(f"[Client WS - {session_id}] Unexpected error in stream_audio_async_multi: {e_outer}")
        # traceback.print_exc()
    finally:
        print(f"[Client WS - {session_id}] Cleaning up resources for session...")
        
        if listener_task and not listener_task.done():
            print(f"[Client WS - {session_id}] Cancelling OpenAI listener task during cleanup...")
            listener_task.cancel()
            try:
                await asyncio.wait_for(listener_task, timeout=1.0) # Give it a moment
            except asyncio.CancelledError:
                print(f"[OpenAI Listener - {session_id}] Task successfully cancelled during cleanup.")
            except asyncio.TimeoutError:
                print(f"[OpenAI Listener - {session_id}] Timeout awaiting cancelled task during cleanup.")
            except Exception as e_task_await:
                print(f"[OpenAI Listener - {session_id}] Error awaiting cancelled task: {e_task_await}")
        
        # The `async with websockets.connect(...)` context manager handles closing `openai_ws`.
        # If openai_ws_connection was assigned and loop exited due to client disconnect before
        # openai_ws context manager exited, ensure it's closed.
        if openai_ws_connection and openai_ws_connection.open:
            print(f"[OpenAI WS - {session_id}] Ensuring OpenAI connection is closed during cleanup.")
            await openai_ws_connection.close()

        # We don't remove the session from active_voice_sessions here.
        # That happens in finalize_stream_multi.
        # The accumulated transcription is in active_voice_sessions[session_id]["transcription"]
        
        # Ensure client websocket is closed if this finally block is reached
        if websocket.client_state != websockets.protocol.State.CLOSED: # Check if FastAPI's WebSocket is closed
             try:
                 await websocket.close(code=1001) # Going away
             except Exception:
                 pass # Already closed or error during close
        print(f"[Client WS - {session_id}] Cleanup for stream_audio_async_multi finished.")


@router.post("/session/finalize_stream_multi", response_model=FollowUpResponse)
async def finalize_stream_multi_session(
    session_id: str = Form(...),
    notepad_image: UploadFile = File(..., description="Image of drawn notes or diagram (WebP format)"),
    last_explanation: bool = Form(False, description="Whether this is the second follow-up question")
):
    print(f"Finalizing multi-stream session for ID: {session_id}")

    if session_id not in active_voice_sessions:
        # TODO: Consider if a more specific error code is better than 404 if session expired vs never existed
        raise HTTPException(status_code=404, detail=f"Session ID {session_id} not found or already finalized.")

    # TODO: Potentially lock access to active_voice_sessions if popping and reading concurrently
    session_data = active_voice_sessions.get(session_id, {}) # Use .get for safety
    final_transcription = session_data.get("transcription", "").strip()
    concept_id_to_process = session_data.get("concept_id")

    if not concept_id_to_process: # Check if session_data was empty or concept_id missing
        active_voice_sessions.pop(session_id, None) # Clean up partial/invalid session
        raise HTTPException(status_code=400, detail=f"Invalid or incomplete session data for ID {session_id}.")

    # Safeguard: ensure listener task is cancelled if somehow still active
    listener_task = session_data.get("openai_listener_task")
    if listener_task and not listener_task.done():
        print(f"[Finalize - {session_id}] Warning: Listener task still active. Attempting to cancel.")
        listener_task.cancel()
        try:
            await asyncio.wait_for(listener_task, timeout=1.0)
        except asyncio.CancelledError:
            pass
        except asyncio.TimeoutError:
            print(f"[Finalize - {session_id}] Timeout cancelling listener task.")
        except Exception as e_cancel_finalize:
            print(f"[Finalize - {session_id}] Error cancelling listener task: {e_cancel_finalize}")

    client = OpenAI(api_key=settings.openai_api_key)
    image_path = None
    audio_output_path = None
    
    # TODO: Wrap main processing in a comprehensive try-except-finally for errors and robust file cleanup.
    try:
        print(f"Processing finalization for session {session_id} with transcription: '{final_transcription[:100]}...'")
        if not final_transcription:
            print(f"Warning: Empty transcription for session {session_id}.")
            # TODO: Decide how to handle: error, default feedback, or proceed.
            # For now, let's proceed and let analyze_image handle it.

        # TODO: Secure path generation for temporary files (e.g., use tempfile module)
        image_path = f"temp_image_{session_id}_{uuid.uuid4()}.webp"
        with open(image_path, "wb") as f:
            image_content = await notepad_image.read() # UploadFile.read() is async
            f.write(image_content)

        # TODO: Robust error handling for CSV read and concept retrieval (try-except around pd.read_csv and iloc)
        concepts_df = pd.read_csv("extracted_key_concepts/ArtificialIntelligence_2_IntelligentAgents-2_qa.csv")
        concept_row = concepts_df.iloc[int(concept_id_to_process) - 1] # Ensure concept_id_to_process is valid int
        concept_explanation = concept_row.iloc[0]
        concept_text = concept_row.name[1] if isinstance(concept_row.name, tuple) and len(concept_row.name) > 1 else str(concept_row.name)

        with open(image_path, "rb") as img_file:
            base64_image = base64.b64encode(img_file.read()).decode("utf-8")
        image_url = f"data:image/webp;base64,{base64_image}"

        conversation_history = "" # Load if needed
        history_file_path = "conversation_history.txt" # TODO: Make configurable
        if os.path.exists(history_file_path):
            with open(history_file_path, "r", encoding="utf-8") as f:
                conversation_history = f.read()
        
        # Assuming analyze_image and generate_answer_audio are synchronous.
        # If they were async, they would need to be awaited.
        # FastAPI runs synchronous functions in a thread pool when called from an async path operation.
        feedback = analyze_image(
            client=client,
            transcription=final_transcription,
            image_url=image_url,
            concept_explanation=concept_explanation,
            concept_text=concept_text,
            conversation_history=conversation_history,
            last_explanation=last_explanation
        )

        audio_output_path = f"temp_response_{session_id}_{uuid.uuid4()}.mp3"
        generate_answer_audio(client, feedback, audio_output_path)

        with open(audio_output_path, "rb") as audio_file_obj:
            audio_base64 = base64.b64encode(audio_file_obj.read()).decode("utf-8")

        save_conversation_to_history(final_transcription, feedback)

        return FollowUpResponse(
            feedback=feedback,
            audio_data=audio_base64,
            transcription=final_transcription # Ensure this is part of your FollowUpResponse model
        )
    # TODO: Add specific exception handling for file operations, API calls, etc.
    except Exception as e_finalize_main:
        print(f"ERROR in finalize_stream_multi_session for {session_id}: {str(e_finalize_main)}")
        # traceback.print_exc()
        # TODO: Consider what status code is most appropriate based on the error
        raise HTTPException(status_code=500, detail=f"Error processing request for session {session_id}: {str(e_finalize_main)}")
    finally:
        # Clean up temporary files
        for path_to_remove in [image_path, audio_output_path]:
            if path_to_remove and os.path.exists(path_to_remove):
                # TODO: Add try-except for os.remove()
                try:
                    os.remove(path_to_remove)
                    print(f"Removed temporary file: {path_to_remove}")
                except Exception as e_remove:
                    print(f"Failed to remove temporary file {path_to_remove}: {e_remove}")
        
        # Clean up the session from active_voice_sessions
        if session_id in active_voice_sessions:
            active_voice_sessions.pop(session_id, None)
            print(f"Session {session_id} removed from active_voice_sessions.")

# Remove or comment out old session/streaming endpoints if these new ones replace them:
# @router.post("/session/initiate") ...
# @router.websocket("/session/stream_audio/{session_id}") ...
# Also, the old /ask-follow-up might be redundant if this new flow is preferred.
# If `transcribe_speech_input` from `.core` is no longer used, you can remove its import.