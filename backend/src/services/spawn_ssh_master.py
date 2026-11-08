#!/usr/bin/env python3
import pty, os, select, sys, time

SOCKET_PATH = os.getenv('MC_SOCKET_PATH', '/tmp/ssh_mux_mcserver')
REMOTE_HOST = os.getenv('MC_REMOTE_HOST', '127.0.0.1')
REMOTE_USER = os.getenv('MC_REMOTE_USER', 'mcadmin')
REMOTE_PASS = os.getenv('MC_REMOTE_PASS', '')

if not REMOTE_HOST:
    print("FAILED: MC_REMOTE_HOST not configured")
    sys.exit(1)

if os.path.exists(SOCKET_PATH):
    try:
        os.remove(SOCKET_PATH)
    except Exception:
        pass

cmd = [
    'ssh', '-M', '-S', SOCKET_PATH,
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'PubkeyAuthentication=no',
    '-o', 'ControlPersist=60m',
    f'{REMOTE_USER}@${REMOTE_HOST}',
    'exit'
]

pid, fd = pty.fork()
if pid == 0:
    os.execvp('ssh', cmd)
else:
    sent_pass = False
    start = time.time()
    while time.time() - start < 10:
        r, _, _ = select.select([fd], [], [], 0.4)
        if fd in r:
            try:
                data = os.read(fd, 2048)
            except OSError:
                break
            if not data:
                break
            if b'password:' in data.lower() and not sent_pass and REMOTE_PASS:
                os.write(fd, f'{REMOTE_PASS}\n'.encode('utf-8'))
                sent_pass = True
    os.close(fd)
    os.waitpid(pid, 0)

if os.path.exists(SOCKET_PATH):
    print("OK")
    sys.exit(0)
else:
    print("FAILED")
    sys.exit(1)
