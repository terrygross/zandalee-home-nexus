import sounddevice as sd
from colorama import init, Fore, Style

init(autoreset=True)

def run_diagnostic():
    """
    Lists all available audio input devices and their properties,
    including the maximum number of input channels.
    """
    print(Fore.CYAN + "--- Microphone Diagnostic Tool ---")
    try:
        devices = sd.query_devices()
        input_devices = [dev for dev in devices if dev['max_input_channels'] > 0]

        if not input_devices:
            print(Fore.RED + "No audio input devices found.")
            return

        print(Fore.YELLOW + "Found the following audio input devices:")
        for i, device in enumerate(devices):
            if device['max_input_channels'] > 0:
                # Highlight the default device
                is_default = '*' if i == sd.default.device[0] else ' '
                print(
                    f" {is_default} " +
                    Fore.WHITE + Style.BRIGHT + f"Index {i}: {device['name']}" +
                    Fore.GREEN + f" (Max Input Channels: {int(device['max_input_channels'])})"
                )
        
        print("\n" + Fore.CYAN + "Please identify your primary microphone from the list above.")
        print("The 'Max Input Channels' value is what we need to set in the hotword_listener.py script.")

    except Exception as e:
        print(Fore.RED + f"An error occurred: {e}")

if __name__ == "__main__":
    run_diagnostic()